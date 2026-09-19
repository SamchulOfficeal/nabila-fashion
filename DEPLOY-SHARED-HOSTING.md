# Shared Hosting-এ চালানোর গাইড (cPanel / Apache)

আপনার সাইট একটা **static site** — যেকোনো shared hosting-এ (Namecheap, Hostinger, Exonhost ইত্যাদি) চলবে। Firebase (Auth/Firestore/Storage) সব ব্যাকএন্ড কাজ করে, তাই hosting-এ PHP/Node কিছুই লাগে না।

## ধাপসমূহ

1. **বিল্ড করুন**
   ```bash
   npm run build
   ```
   `dist/` ফোল্ডারে সব ফাইল তৈরি হবে।

2. **cPanel → File Manager → public_html** খুলুন।

3. `dist/`-এর **সব ফাইল** (`.htaccess` সহ — hidden ফাইল দেখতে "Show Hidden Files" চালু করুন) `public_html`-এ আপলোড করুন।
   - সাবফোল্ডারে (যেমন `example.com/shop/`) চালালে `.htaccess`-এর `RewriteBase /` লাইনটা `RewriteBase /shop/` করুন।

4. **ব্যস!** সাইট লাইভ। SSL-এর জন্য cPanel → SSL/TLS Status → AutoSSL চালু করুন।

## গুরুত্বপূর্ণ

- `.htaccess` **অবশ্যই** আপলোড করতে হবে — এটা ছাড়া `/orders` বা `/product/xyz`-এ সরাসরি গেলে 404 দেখাবে (এটাই "refresh করলে কাজ করে, লিংকে গেলে ভাঙে" সমস্যার কারণ)।
- ডোমেইন বদলালে `public/sitemap.xml`, `public/robots.txt` এবং `index.html`-এর canonical URL আপডেট করুন।
- Firestore rules ডেপ্লয়: `firebase deploy --only firestore:rules`
- Cloud Function (push notification): `cd functions && npm install && npx firebase-tools deploy --only functions`

# English summary

`npm run build` → upload **everything inside `dist/`** (including the hidden `.htaccess`) to `public_html`. The `.htaccess` handles SPA deep-link routing, gzip compression, immutable asset caching and security headers. Enable AutoSSL in cPanel. No PHP/Node needed — Firebase handles all backend work.
