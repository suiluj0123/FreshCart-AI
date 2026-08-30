# FreshCart

FreshCart is a full-stack grocery web app built to make grocery shopping easier and help stores manage fresh inventory and reduce food waste. It includes a customer store for buying groceries and meal planning, and an admin portal for store staff to handle orders, stock, and reports.

---

## About the Project

I built FreshCart to solve common problems in grocery shopping and store inventory. For shoppers, it helps them find ingredients and plan weekly meals based on their budget and diet. For store owners, it tracks expiring produce in real time, creates discount bundles for items close to expiry, and keeps an eye on daily sales and orders.

---

## Main Features

### Customer Storefront

* **Product Catalog:** Browse groceries by category (vegetables, fruits, meat, dairy, pantry) with real-time stock and prices.
* **Meal Planner:** Lets users generate meal plans for the week, calculates needed ingredients, and adds missing items straight to the cart.
* **Item Substitutions:** Suggests alternative ingredients if an item is out of stock or if the user has dietary preferences.
* **Shopping Cart & Checkout:** Supports Cash on Delivery (COD) and online payments, with options for home delivery or store pickup.
* **Order History & Tracking:** Users can view their past orders and track current order status in real time.
* **User Authentication & Security:** Sign in and sign up drawer with rate-limiting (locks for 10 minutes after 4 wrong attempts) and a forgot password feature.

### Admin Dashboard

* **Overview & Analytics:** Quick summary of daily sales, total revenue, active orders, online users, and low stock warnings.
* **Inventory & Batch Tracking:** Receive new batches with cost prices and expiry dates using First-In, First-Out (FIFO) logic, plus waste/spoilage logging.
* **Order Fulfillment Pipeline:** Live board showing orders from placed, packed, out for delivery/ready for pickup, to completed.
* **Clearance Deals:** Automatically flags batches expiring in 1 to 7 days and applies discounts so items sell before spoiling.
* **User Management:** View all registered customers and staff, edit user details and roles, see locked accounts, and unlock accounts with one click.
* **Reports & Sales:** Tabbed reports for revenue, inventory health, food waste, customer stats, and login activity, with date range filters and CSV export.
* **Audit Trail:** Logs system actions like inventory receipts, order status changes, and user updates for accountability.
* **Admin Settings:** Update admin profile name and contact number, and log out securely.

---

## Tech Stack

* **Frontend & Backend:** Next.js 16 (App Router), React, TypeScript
* **Styling:** Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL, Supabase Auth)
* **Meal Planning API:** Google Gemini API
* **Hosting:** Vercel

---

## License

MIT License
