const STORAGE_KEY = "stockplan-demo-cart";
const CART_CHANGE_EVENT = "stockplan-cart-updated";

export function getCartItems() {
    try {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(items) ? items : [];
    } catch {
        return [];
    }
}

function saveCartItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
    return items;
}

export function addToCart(product, size, quantity) {
    const cartItems = getCartItems();
    const existingItem = cartItems.find((item) => item.productId === product.id && item.size === size);

    if (existingItem) {
        existingItem.quantity = Math.min(10, existingItem.quantity + quantity);
    } else {
        cartItems.push({
            productId: product.id,
            name: product.name,
            image: product.image,
            price: product.price,
            size,
            quantity
        });
    }

    return saveCartItems(cartItems);
}

export function updateCartItemQuantity(productId, size, quantity) {
    const updatedItems = getCartItems()
        .map((item) => item.productId === productId && item.size === size
            ? { ...item, quantity: Math.min(10, Math.max(1, quantity)) }
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
