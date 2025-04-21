Perfect! Thanks for the full context, Inah — that helps a lot. You're working with a **private GitHub repo**, a `backend` folder containing a `server.js`, and a `package.json` for your Node.js dependencies. The startup command is:

```bash
node server.js
```

Let me guide you step-by-step on how to **deploy this to Azure App Service** with CI/CD using **GitHub Actions**, which is perfect for your private repo and allows auto-deploys on push.

---

## 🚀 Deployment Plan Using GitHub Actions

### 🧱 Your Project Structure
Assuming your project structure is:

```
repo-root/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ... (other files)
```

---

## ✅ Step-by-Step Deployment Guide

### 1. **Create Azure App Service**

- Go to Azure Portal → **App Services** → Create a new one.
- Choose:
  - **Runtime stack**: Node.js (match your Node version in `package.json`)
  - **Region**: Closest to your users
  - **Linux** as OS (better for Node.js apps)
  - Use default options for now, or a free tier for testing (`F1`).

---

### 2. **Configure GitHub Actions CI/CD**

1. In your Azure App Service, go to:
   - **Deployment Center** → Source: **GitHub**
   - Select your private repo and branch
   - Build provider: **GitHub Actions**
   - Click **Finish**
   - This creates a `.github/workflows/azure-webapp.yml` in your repo

---

### 3. **Customize GitHub Actions Workflow**

You need to **modify the YAML** so it:
- Installs Node.js
- Navigates to `backend/`
- Installs dependencies
- Runs `node server.js`

Here’s a working example for your setup:

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend to Azure Web App

on:
  push:
    branches:
      - main  # or your deployment branch

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repo
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'  # Match your version

    - name: Install dependencies
      working-directory: ./backend
      run: npm install

    - name: Zip the backend
      run: zip -r backend.zip backend/

    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: <your-app-name>  # e.g., unichain-backend
        slot-name: 'production'
        publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
        package: backend.zip
```

---

### 4. **Set the Startup Command in Azure**

Since your entry file is `server.js`, go to:

- Azure Portal → Your App Service
- Go to **Configuration** > **General Settings**
- Under **Startup Command**, enter:

```bash
node backend/server.js
```

---

### 5. **Add Your GitHub Secret (AZURE_PUBLISH_PROFILE)**

1. In Azure Portal → App Service → **Deployment Center**
2. Click **"Get Publish Profile"** (download a `.PublishSettings` file)
3. In GitHub:
   - Go to **Repo Settings → Secrets → Actions**
   - Add a new secret named: `AZURE_PUBLISH_PROFILE`
   - Paste the contents of the `.PublishSettings` file

---

## 🎉 Result

- When you push to your GitHub branch, GitHub Actions:
  - Installs Node
  - Installs dependencies from `package.json`
  - Deploys the zipped backend folder to Azure
- Azure will start `node backend/server.js`

---

## ❓Bonus Tips

- Make sure your `server.js` listens on the port provided by Azure:
```js
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

- Use a `.env` file and consider using Azure's **Application Settings** for production secrets.

---

Would you like help generating a ready-to-copy workflow file tailored to your exact app name and Node version?