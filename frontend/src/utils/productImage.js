// Misma regla que backend/src/utils/product-image.js: el archivo se llama como el producto,
// en minúsculas, sin tildes, espacios ni símbolos, y es .png.
export function productImageSlug(name) {
    return String(name ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export function expectedImageFile(name) {
    const slug = productImageSlug(name);
    return slug ? `${slug}.png` : "";
}
