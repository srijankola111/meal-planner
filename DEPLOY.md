# Deploy Meal Planner to srijflix.com

Follow these steps to put your site live on **srijflix.com** using GitHub + Netlify.

**Already done for you:** Git is initialized and the first commit is created. You only need to create the GitHub repo, add the remote, push, then connect Netlify.

---

## 1. Push code to GitHub

If Git asks “who are you?” the first time, run (use your real name/email):

```bash
git config --global user.email "your@email.com"
git config --global user.name "Your Name"
```

Create a **new repository** on GitHub: go to [github.com/new](https://github.com/new), name it (e.g. `meal-planner`), and leave “Add README” / “Add .gitignore” **unchecked**. Then in the project folder run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/meal-planner.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 2. Deploy on Netlify

1. Go to **[app.netlify.com](https://app.netlify.com)** and sign in (or create a free account).
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and authorize Netlify. Select your **meal-planner** repo.
4. Netlify will detect the site:
   - **Build command:** leave empty
   - **Publish directory:** `.` (already set via `netlify.toml`)
5. Click **Deploy site**. The site will get a URL like `random-name-123.netlify.app`.

---

## 3. Use your domain srijflix.com

1. In Netlify: **Site configuration** → **Domain management** → **Add domain** / **Add custom domain**.
2. Enter **srijflix.com** (and **www.srijflix.com** if you want).
3. **If srijflix.com is already registered:**
   - Netlify will show DNS instructions.
   - Easiest: use **Netlify DNS** – add the domain, then at your domain registrar (where you bought srijflix.com) set the **nameservers** to the ones Netlify gives you.
   - Or add the **A/CNAME records** Netlify shows at your current DNS provider.
4. Wait for DNS to update (up to 24–48 hours; often a few minutes). Netlify will issue HTTPS automatically.

---

## Done

Your meal planner will be live at **https://srijflix.com**. Every push to `main` will trigger a new deploy.
