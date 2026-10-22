// Danh sách yêu thích
        function toggleWishlist(id) {
            if (wishlist.includes(id)) {
                wishlist = wishlist.filter(item => item !== id);
            } else {
                wishlist.push(id);
            }
            localStorage.setItem('diemmy_wishlist', JSON.stringify(wishlist));
            updateWishlistBadge();
            applyFilters();
        }

        function updateWishlistBadge() {
            const badge = document.getElementById('wishlist-badge');
            if (wishlist.length > 0) {
                badge.innerText = wishlist.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        function toggleWishlistModal() {
            if (wishlist.length === 0) {
                alert('Danh sách yêu thích của chị Diễm My hiện chưa có sản phẩm nào!');
                return;
            }
            let wishProducts = products.filter(p => wishlist.includes(p.id));
            renderProducts(wishProducts);
        }

        /* ==========================================================================
           CHECKOUT & VIETQR PAYMENT LOGIC
           ========================================================================== */
