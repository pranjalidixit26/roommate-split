# Flat Expenses

Run locally:
1. Create an empty MySQL database called roommate_split (XAMPP is fine).
2. npm install
3. Set PEOPLE=YourName,FriendName and APP_PIN=1234 (optional), then npm start
4. Open http://localhost:3000

Deploy on Railway:
1. Push this folder to a GitHub repo and create a new Railway project from it.
2. Add a MySQL service, then in the web service add variable MYSQL_URL = the MySQL service's MYSQL_URL (use a variable reference).
3. Add PEOPLE and APP_PIN variables, then generate a public domain.