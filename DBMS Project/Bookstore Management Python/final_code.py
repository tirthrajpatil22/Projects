import mysql.connector
from datetime import date

# --- Connect to MySQL ---
mydb = mysql.connector.connect(
    host="localhost",
    user="root",
    password="root",
    database="bookstore"
)
cursor = mydb.cursor()

# --- Admin Menu ---
def admin_menu():
    while True:
        print("\n--- ADMIN MENU ---")
        print("1. Book Management")
        print("2. Customer Management")
        print("3. Staff Management")
        print("4. View Reports")
        print("5. Logout")

        choice = input("Enter choice: ")
        if choice == "1":
            book_management()
        elif choice == "2":
            customer_management()
        elif choice == "3":
            staff_management()
        elif choice == "4":
            view_reports()
        elif choice == "5":
            break
        else:
            print("Invalid choice.")

# --- Book Management ---
def book_management():
    while True:
        print("\n--- BOOK MANAGEMENT ---")
        print("1. Add Book")
        print("2. View All Books")
        print("3. Delete Book")
        print("4. Back to Admin Menu")

        choice = input("Enter choice: ")
        if choice == "1":
            add_book()
        elif choice == "2":
            view_books()
        elif choice == "3":
            delete_book()
        elif choice == "4":
            break
        else:
            print("Invalid choice.")

def add_book():
    try:
        b_id = int(input("Book ID: "))
        b_name = input("Book Name: ")
        a_name = input("Author Name: ")
        genre = input("Genre: ")
        quantity = int(input("Quantity: "))
        price = float(input("Price: "))
        cursor.execute("INSERT INTO Books VALUES (%s, %s, %s, %s, %s, %s)",
                       (b_id, b_name, a_name, genre, quantity, price))
        mydb.commit()
        print("Book added.")
    except Exception as e:
        print("Error adding book:", e)

def delete_book():
    try:
        b_id = int(input("Enter Book ID to delete: "))
        cursor.execute("DELETE FROM Books WHERE b_id = %s", (b_id,))
        mydb.commit()
        print("Book deleted.")
    except Exception as e:
        print("Error deleting book:", e)

def view_books():
    cursor.execute("SELECT * FROM Books WHERE quantity > 0")
    for book in cursor.fetchall():
        print(book)

# --- Customer Management ---
def customer_management():
    while True:
        print("\n--- CUSTOMER MANAGEMENT ---")
        print("1. Add Customer")
        print("2. View All Customers")
        print("3. Delete Customer")
        print("4. Back to Admin Menu")

        choice = input("Enter choice: ")
        if choice == "1":
            add_customer()
        elif choice == "2":
            view_customers()
        elif choice == "3":
            delete_customer()
        elif choice == "4":
            break
        else:
            print("Invalid choice.")

def add_customer():
    try:
        c_id = int(input("Customer ID: "))
        c_name = input("Customer Name: ")
        c_email = input("Customer Email: ")
        cursor.execute("INSERT INTO Customer (c_id, c_name, c_email) VALUES (%s, %s, %s)",
                       (c_id, c_name, c_email))
        mydb.commit()
        print("Customer added.")
    except Exception as e:
        print("Error adding customer:", e)

def delete_customer():
    try:
        c_id = int(input("Enter Customer ID to delete: "))
        cursor.execute("DELETE FROM Customer WHERE c_id = %s", (c_id,))
        mydb.commit()
        print("Customer deleted.")
    except Exception as e:
        print("Error deleting customer:", e)

def view_customers():
    cursor.execute("SELECT * FROM Customer")
    for row in cursor.fetchall():
        print(row)

# --- Staff Management ---
def staff_management():
    while True:
        print("\n--- STAFF MANAGEMENT ---")
        print("1. Add Staff")
        print("2. View All Staff")
        print("3. Delete Staff")
        print("4. Back to Admin Menu")

        choice = input("Enter choice: ")
        if choice == "1":
            add_staff()
        elif choice == "2":
            view_staff()
        elif choice == "3":
            delete_staff()
        elif choice == "4":
            break
        else:
            print("Invalid choice.")

def add_staff():
    try:
        s_id = int(input("Staff ID: "))
        s_name = input("Staff Name: ")
        s_phone = input("Phone: ")
        designation = input("Designation: ")
        cursor.execute("INSERT INTO Staff VALUES (%s, %s, %s, %s)", (s_id, s_name, s_phone, designation))
        mydb.commit()
        print("Staff added.")
    except Exception as e:
        print("Error adding staff:", e)

def delete_staff():
    try:
        s_id = int(input("Enter Staff ID to delete: "))
        cursor.execute("DELETE FROM Staff WHERE s_id = %s", (s_id,))
        mydb.commit()
        print("Staff deleted.")
    except Exception as e:
        print("Error deleting staff:", e)

def view_staff():
    cursor.execute("SELECT * FROM Staff")
    for row in cursor.fetchall():
        print(row)

# --- View Reports ---
def view_reports():
    cursor.execute("SELECT * FROM Reports")
    for row in cursor.fetchall():
        print(row)

# --- Customer Menu ---
def customer_menu(cust_id):
    while True:
        print("\n--- CUSTOMER MENU ---")
        print("1. View Books")
        print("2. Buy Book")
        print("3. View Purchase History")
        print("4. Logout")
        choice = input("Enter choice: ")
        if choice == "1":
            view_books()
        elif choice == "2":
            buy_book(cust_id)
        elif choice == "3":
            view_purchase_history(cust_id)
        elif choice == "4":
            break
        else:
            print("Invalid choice.")

def buy_book(cust_id):
    view_books()
    try:
        b_id = int(input("Enter Book ID to buy: "))
        qty = int(input("Enter quantity: "))
        cursor.execute("SELECT quantity, price FROM Books WHERE b_id = %s", (b_id,))
        result = cursor.fetchone()
        if not result:
            print("Book not found.")
            return
        stock, price = result
        if qty > stock:
            print("Not enough stock.")
            return
        total_price = price * qty
        today = date.today()
        cursor.execute("SELECT MAX(r_no) FROM Reports")
        rno = cursor.fetchone()[0]
        rno = 1 if rno is None else rno + 1
        cursor.execute("INSERT INTO Reports VALUES (%s, %s, %s, %s, %s, %s)",
                       (rno, b_id, cust_id, today, qty, total_price))
        cursor.execute("UPDATE Books SET quantity = quantity - %s WHERE b_id = %s", (qty, b_id))
        mydb.commit()
        print("Purchase successful. Total: Rs.", total_price)
    except Exception as e:
        print("Error during purchase:", e)

def view_purchase_history(cust_id):
    cursor.execute("SELECT * FROM Reports WHERE c_id = %s", (cust_id,))
    records = cursor.fetchall()
    if records:
        for row in records:
            print(row)
    else:
        print("No purchases yet.")

# --- Login System ---
def login():
    login_id = input("Login ID: ")
    password = input("Password: ")

    if login_id == "chirag" and password == "admin":
        admin_menu()
    elif login_id in ["smera", "prachi", "tirthraj", "sairaj", "sankalp", "ayush"] and password == "1234":
        cursor.execute("SELECT cust_id FROM Customer WHERE c_name = %s", (login_id,))
        row = cursor.fetchone()
        if row:
            customer_menu(row[0])
        else:
            print("Customer not found.")
    else:
        print("Invalid login.")


# --- Main Loop ---
def main():
    while True:
        print("\n--- BOOKSTORE MANAGEMENT SYSTEM ---")
        print("1. Login")
        print("2. Exit")
        choice = input("Enter your choice: ")
        if choice == "1":
            login()
        elif choice == "2":
            break
        else:
            print("Invalid option.")

main()
