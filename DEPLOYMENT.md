# Deployment Guide for SV Enterprises

This guide will help you deploy your React application to the web. We recommend **Vercel** or **Netlify** as they are free, easy to use, and optimized for Vite/React apps.

## Prerequisites

1.  **GitHub Account**: Ensure your project is pushed to a GitHub repository.
2.  **Supabase Project**: Your database is already set up on Supabase.

---

## Option 1: Deploy to Vercel (Recommended)

1.  **Push to GitHub**:
    *   If you haven't already, commit your changes and push your code to a GitHub repository.

2.  **Sign up/Login to Vercel**:
    *   Go to [vercel.com](https://vercel.com) and sign up using your GitHub account.

3.  **Import Project**:
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your `SVT` repository from the list.
    *   Click **"Import"**.

4.  **Configure Project**:
    *   **Framework Preset**: Vercel should automatically detect `Vite`.
    *   **Root Directory**: Leave as `./`.
    *   **Environment Variables**: You MUST add your Supabase keys here.
        *   Expand the "Environment Variables" section.
        *   Add `VITE_SUPABASE_URL` and paste your URL.
        *   Add `VITE_SUPABASE_ANON_KEY` and paste your Anon Key.
        *   *(You can find these in your local `.env` file)*.

5.  **Deploy**:
    *   Click **"Deploy"**.
    *   Wait for the build to finish. Vercel will give you a live URL (e.g., `sv-enterprises.vercel.app`).

6.  **Update Supabase Auth Settings**:
    *   Go to your **Supabase Dashboard** -> **Authentication** -> **URL Configuration**.
    *   Add your new Vercel URL (e.g., `https://sv-enterprises.vercel.app`) to the **Site URL** and **Redirect URLs**.
    *   This ensures login/signup works correctly on the live site.

---

## Option 2: Deploy to Netlify

1.  **Sign up/Login to Netlify**:
    *   Go to [netlify.com](https://netlify.com).

2.  **Add New Site**:
    *   Click **"Add new site"** -> **"Import from existing project"**.
    *   Select **GitHub**.
    *   Choose your repository.

3.  **Configure Build**:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`

4.  **Environment Variables**:
    *   Click **"Show advanced"** or go to **Site Settings** -> **Environment variables**.
    *   Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

5.  **Deploy**:
    *   Click **"Deploy site"**.

6.  **Update Supabase**:
    *   Don't forget to update your Supabase Auth URL settings with your new Netlify domain!

---

## Important Notes

*   **Build Command**: The standard build command for this project is `npm run build`.
*   **Output Directory**: The build output goes to the `dist` folder.
*   **Environment Variables**: Never commit your `.env` file to GitHub. Always set these variables in the hosting provider's dashboard.
