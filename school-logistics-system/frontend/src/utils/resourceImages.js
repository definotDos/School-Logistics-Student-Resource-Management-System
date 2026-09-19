const resourceImages = {
  "mathematics book": "/mathematics-book.svg",
  "learning modules": "/learning-modules.svg",
  "school shoes": "/Shoes.jpg",
  "school uniform": "/school-uniform.svg",
  "student id": "/student-id.svg",
};

export function getResourceImage(resource) {
  return resource?.image || resourceImages[(resource?.name || "").trim().toLowerCase()] || "";
}
