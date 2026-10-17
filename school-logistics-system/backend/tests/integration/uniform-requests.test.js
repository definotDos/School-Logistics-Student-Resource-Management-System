const http = require("supertest");
const app = require("../../src/app");
const { connectTestDatabase, fixtures } = require("../helpers/database");
const Resource = require("../../src/models/Resource");
const Request = require("../../src/models/Request");

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
