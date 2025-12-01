# SV Enterprises - Premium Sanitary Solutions

A modern, full-stack e-commerce platform for sanitary and plumbing products, built with React, Supabase, and Tailwind CSS.

![Project Banner](public/favicon.svg)

## 🚀 Features

### Customer Storefront
*   **3D Hero Section**: Interactive 3D brand display using React Three Fiber.
*   **Product Catalog**: Browse products by category with advanced filtering.
*   **Real-time Updates**: Live inventory and price updates.
*   **Shopping Cart**: Persistent cart management.
*   **User Accounts**: Profile management, order history, and address book.
*   **Secure Checkout**: Integrated order processing flow.

### Admin Dashboard
*   **Overview**: Real-time sales statistics and revenue charts.
*   **Product Management**: Create, edit, and delete products with image uploads.
*   **Order Management**: View and update order statuses.
*   **Counter Sales**: Track offline/cash sales alongside online orders.
*   **Customer Insights**: View registered customer data.

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, TypeScript
*   **Styling**: Tailwind CSS, Shadcn UI
*   **State Management**: Zustand
*   **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Realtime)
*   **3D Graphics**: React Three Fiber, Drei
*   **Routing**: React Router DOM

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/nishanthchowdary1234/SV-Enterprises.git
    cd SV-Enterprises
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions on Vercel or Netlify.

## 📄 License

This project is licensed under the MIT License.
