const STORAGE_KEY = "stockplan-demo-cart";
const CART_CHANGE_EVENT = "stockplan-cart-updated";
const MAX_PER_ITEM = 10;

// Los artículos del carrito ahora guardan la referencia real (producto + talla) de la base de datos.
// Los artículos de la versión de demostración no la tienen y se descartan.
export function getCartItems() {
    try {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(items) ? items.filter((item) => item && item.referenceId) : [];
    } catch {
        return [];
    }
}

function saveCartItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
    return items;
}

function limitOf(item) {
    return Math.min(MAX_PER_ITEM, item.maxQuantity ?? MAX_PER_ITEM);
}

// size = { referenceId, sizeName, maxQuantity } tal como lo entrega /api/store/productos/:id
export function addToCart(product, size, quantity) {
    const cartItems = getCartItems();
    const existingItem = cartItems.find((item) => item.referenceId === size.referenceId);
    const maxQuantity = Math.min(MAX_PER_ITEM, size.maxQuantity ?? MAX_PER_ITEM);

    if (existingItem) {
        existingItem.maxQuantity = maxQuantity;
        existingItem.price = product.price;
        existingItem.quantity = Math.min(maxQuantity, existingItem.quantity + quantity);
    } else {
        cartItems.push({
            productId: product.id,
            referenceId: size.referenceId,
            name: product.name,
            image: product.image,
            price: product.price,
            size: size.sizeName,
            maxQuantity,
            quantity: Math.min(maxQuantity, quantity)
        });
    }

    return saveCartItems(cartItems);
}

export function updateCartItemQuantity(productId, size, quantity) {
    const updatedItems = getCartItems()
        .map((item) => item.productId === productId && item.size === size
            ? { ...item, quantity: Math.min(limitOf(item), Math.max(1, quantity)) }
            : item);
    return saveCartItems(updatedItems);
}

export function removeCartItem(productId, size) {
    return saveCartItems(getCartItems().filter((item) => !(item.productId === productId && item.size === size)));
}

export function clearCart() {
    return saveCartItems([]);
}

export function getCartItemCount() {
    return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(items = getCartItems()) {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function getCartChangeEventName() {
    return CART_CHANGE_EVENT;
}

export function formatCartPrice(price) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(price);
}
