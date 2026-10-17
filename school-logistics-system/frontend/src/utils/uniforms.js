export const isSchoolUniform = (resource) =>
  resource.name?.trim().toLowerCase() === "school uniform";

export const getUniformStyleImage = (style) => ({
  "Trojan T-shirt": "/trojan-transparent.png",
  "CITE Polo": "/cite-transparent.png",
})[style] || "";
