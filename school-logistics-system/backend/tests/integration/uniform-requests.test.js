const http = require("supertest");
const app = require("../../src/app");
const { connectTestDatabase, fixtures } = require("../helpers/database");
const Resource = require("../../src/models/Resource");
const Request = require("../../src/models/Request");
const { prepareRequestIndexes, activeRequestIndex } = require("../../src/utils/requestIndexes");

let data;
beforeAll(connectTestDatabase);
beforeEach(async () => {
  data = await fixtures();
  await Resource.findByIdAndUpdate(data.resource._id, { name: "School Uniform", category: "Uniform" });
});
const api = (method, path, role = "student") => http(app)[method](`/api${path}`).set("Authorization", `Bearer ${data.tokens[role]}`);

test.each([["Trojan T-shirt", "M"], ["CITE Polo", "2XL"]])("persists %s / %s and returns preferences to students and reviewers", async (uniformStyle, uniformSize) => {
  const preferences = { uniformStyle, uniformSize };
  const result = await api("post", "/requests").send({ resource: data.resource._id, quantity: 1, ...preferences }).expect(201);
  const id = result.body.request.databaseId;
  expect(await Request.findById(id).lean()).toMatchObject(preferences);
  for (const role of ["student", "staff", "admin"]) {
    const list = await api("get", role === "student" ? "/requests/my" : "/requests/all", role).expect(200);
    expect(list.body.requests.find(request => request.databaseId === id)).toMatchObject(preferences);
  }
  await api("post", "/requests").send({ resource: data.resource._id, quantity: 1, ...preferences }).expect(400);
});

test.each([{}, { uniformStyle: "CITE Polo" }, { uniformStyle: "Other", uniformSize: "M" }, { uniformStyle: "Trojan T-shirt", uniformSize: "INVALID" }])("rejects missing or invalid preferences: %j", async preferences => {
  await api("post", "/requests").send({ resource: data.resource._id, quantity: 1, ...preferences }).expect(400);
  expect(await Request.countDocuments({ student: data.users.student._id })).toBe(0);
});

test("rejects uniform preferences on non-uniform resources", async () => {
  await Resource.findByIdAndUpdate(data.resource._id, { name: "Book", category: "Books" });
  await api("post", "/requests").send({ resource: data.resource._id, uniformStyle: "CITE Polo", uniformSize: "S" }).expect(400);
  await api("post", "/requests").send({ resource: data.resource._id, quantity: 1 }).expect(201);
});

test("allows separate styles but blocks another active request for the same style regardless of size", async () => {
  for (const uniformStyle of ["Trojan T-shirt", "CITE Polo"]) {
    await api("post", "/requests").send({ resource: data.resource._id, uniformStyle, uniformSize: "M" }).expect(201);
    const duplicate = await api("post", "/requests").send({ resource: data.resource._id, uniformStyle, uniformSize: "L" }).expect(400);
    expect(duplicate.body.message).toContain(uniformStyle);
  }
  const list = await api("get", "/requests/my").expect(200);
  expect(list.body.requests).toHaveLength(2);
  expect(list.body.requests.map(request => request.uniformStyle).sort()).toEqual(["CITE Polo", "Trojan T-shirt"]);
});

test("migrates the legacy unique index while keeping same-style duplicate protection", async () => {
  const collection = Request.db.collection(`request_index_test_${data.resource._id}`);
  await collection.createIndex({ student: 1, resourceRef: 1 }, { ...activeRequestIndex, name: "student_1_resourceRef_1" });
  const base = { student: data.users.student._id, resourceRef: data.resource._id, status: "pending" };
  await collection.insertOne({ ...base, uniformStyle: "Trojan T-shirt" });
  await expect(collection.insertOne({ ...base, uniformStyle: "CITE Polo" })).rejects.toMatchObject({ code: 11000 });
  await prepareRequestIndexes({ collection });
  await prepareRequestIndexes({ collection });
  await collection.insertOne({ ...base, uniformStyle: "CITE Polo" });
  await expect(collection.insertOne({ ...base, uniformStyle: "CITE Polo", uniformSize: "XL" })).rejects.toMatchObject({ code: 11000 });
  await collection.insertOne({ ...base, uniformStyle: "CITE Polo", status: "completed" });
  expect(await collection.countDocuments()).toBe(3);
});

test("concurrent requests for the same style save only one request", async () => {
  const responses = await Promise.all([1, 2].map(() => api("post", "/requests").send({ resource: data.resource._id, uniformStyle: "CITE Polo", uniformSize: "XL" })));
  expect(responses.filter(response => response.status === 201)).toHaveLength(1);
  expect(responses.filter(response => [400, 409].includes(response.status))).toHaveLength(1);
  expect(await Request.countDocuments({ student: data.users.student._id })).toBe(1);
});
