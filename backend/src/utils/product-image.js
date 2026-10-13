const IMAGE_FOLDER = "/images/products";

// "Run Falcon" -> "runfalcon". Minúsculas, sin tildes, solo letras y números.
export function productImageSlug(name) {
    return String(name ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export function productImageFile(name) {
    const slug = productImageSlug(name);
    return slug ? `${slug}.png` : null;
}

export function productImageUrl(name) {
    const file = productImageFile(name);
    return file ? `${IMAGE_FOLDER}/${file}` : null;
}
