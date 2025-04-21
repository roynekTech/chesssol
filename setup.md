sudo apt update && sudo apt upgrade -y
sudo apt update
sudo apt install -y curl
sudo apt install git curl ufw build-essential -y

# Install Node.js (latest LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Confirm installation
node -v
npm -v


sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000
sudo ufw allow 8080

sudo npm install -g pm2


sudo apt install mysql-server -y
sudo mysql_secure_installation
sudo mysql -u root -p

<!-- mysql code -->
CREATE DATABASE chesssol_db;
CREATE USER 'chesssol_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON chesssol_db.* TO 'chesssol_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;


git clone https://github.com/your-username/chesssol-backend.git


cd chesssol-backend/backend
npm install
node server.js


cd ../../
pm2 start chesssol-backend/backend/server.js --name chesssol-app
pm2 save
pm2 startup


sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/chesssol


server {
    listen 80;
    server_name chesssol.yourdomain.com; #or public ip address

    location / {
        # proxy_pass http://localhost:3000;  # or your server.js port
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}


sudo apt install unzip


#check real time logs

pm2 logs websocket-app
pm2 info websocket-app
