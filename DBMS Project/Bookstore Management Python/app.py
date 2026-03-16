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
        print("2. Author Management")
        print("3. Staff Management")
        print("4. Customer Management")
        print("5. View Reports")
        print("6. Logout")

        choice = input("Enter choice: ")
        if choice == "1": book_menu()
        elif choice == "2": author_menu()
        elif choice == "3": staff_menu()
        elif choice == "4": customer_menu_admin()
        elif choice == "5": view_reports()
        elif choice == "6": break
        else: print("Invalid choice.")

def book_menu():
    while True:
        print("\n--- BOOK MANAGEMENT ---")
        print("1. Add Book")
        print("2. Delete Book")
        print("3. View All Books")
        print("4. Back to Admin Menu")
        choice = input("Enter choice: ")
        if choice == "1": add_book()
        elif choice == "2": delete_book()
        elif choice == "3": view_books()
        elif choice == "4": break
        else: print("Invalid choice.")

def author_menu():
    while True:
        print("\n--- AUTHOR MANAGEMENT ---")
        print("1. Add Author")
        print("2. Delete Author")
        print("3. View All Authors")
        print("4. Back to Admin Menu")
        choice = input("Enter choice: ")
        if choice == "1": add_author()
        elif choice == "2": delete_author()
        elif choice == "3": view_authors()
        elif choice == "4": break
        else: print("Invalid choice.")

def staff_menu():
    while True:
        print("\n--- STAFF MANAGEMENT ---")
        print("1. Add Staff")
        print("2. Delete Staff")
        print("3. View All Staff")
        print("4. Back to Admin Menu")
        choice = input("Enter choice: ")
        if choice == "1": add_staff()
        elif choice == "2": delete_staff()
        elif choice == "3": view_staff()
        elif choice == "4": break
        else: print("Invalid choice.")

def customer_menu_admin():
    while True:
        print("\n--- CUSTOMER MANAGEMENT ---")
        print("1. Add Customer")
        print("2. View All Customers")
        print("3. Delete Customer")
        print("4. Back to Admin Menu")
        choice = input("Enter choice: ")
        if choice == "1": add_customer()
        elif choice == "2": view_customers()
        elif choice == "3": delete_customer()
        elif choice == "4": break
        else: print("Invalid choice.")

# --- Admin Actions ---
def add_book():
    try:
        b_id = int(input("Book ID: "))
        b_name = input("Book Name: ")
        a_name = input("Author Name: ")
        genre = input("Genre: ")
        quantity = int(input("Quantity: "))
        price = float(input("Price: "))
        cursor.execute("INSERT INTO Books VALUES (%s, %s, %s, %s, %s, %s)", (b_id, b_name, a_name, genre, quantity, price))
        mydb.commit()
        print("Book added.")
    except: print("Error adding book.")

def delete_book():
    try:
        b_id = int(input("Enter Book ID to delete: "))
        cursor.execute("DELETE FROM Books WHERE b_id = %s", (b_id,))
        mydb.commit()
        print("Book deleted.")
    except: print("Error deleting book.")

def add_author():
    try:
        a_id = int(input("Author ID: "))
        a_name = input("Author Name: ")
        cursor.execute("INSERT INTO Author VALUES (%s, %s)", (a_id, a_name))
        mydb.commit()
        print("Author added.")
    except: print("Error adding author.")

def delete_author():
    try:
        a_id = int(input("Enter Author ID to delete: "))
        cursor.execute("DELETE FROM Author WHERE a_id = %s", (a_id,))
        mydb.commit()
        print("Author deleted.")
    except: print("Error deleting author.")

def view_authors():
    cursor.execute("SELECT * FROM Author")
    for row in cursor.fetchall():
        print(row)

def add_staff():
    try:
        s_id = int(input("Staff ID: "))
        s_name = input("Staff Name: ")
        s_phone = input("Phone: ")
        designation = input("Designation: ")
        cursor.execute("INSERT INTO Staff VALUES (%s, %s, %s, %s)", (s_id, s_name, s_phone, designation))
        mydb.commit()
        print("Staff added.")
    except: print("Error adding staff.")

def delete_staff():
    try:
        s_id = int(input("Enter Staff ID to delete: "))
        cursor.execute("DELETE FROM Staff WHERE s_id = %s", (s_id,))
        mydb.commit()
        print("Staff deleted.")
    except: print("Error deleting staff.")

def view_staff():
    cursor.execute("SELECT * FROM Staff")
    for row in cursor.fetchall():
        print(row)

def add_customer():
    try:
        cust_id = int(input("Customer ID: "))
        c_name = input("Customer Name: ")
        address = input("Address: ")
        phone = input("Phone Number: ")
        login_id = input("Login ID: ")
        password = input("Password: ")

        cursor.execute("INSERT INTO Customer VALUES (%s, %s, %s, %s, %s)", (cust_id, c_name, address, phone, login_id))
        cursor.execute("INSERT INTO Authentication VALUES (%s, %s)", (login_id, password))
        mydb.commit()
        print("Customer added.")
    except Exception as e:
        print("Error adding customer:", e)

def view_customers():
    cursor.execute("SELECT * FROM Customer")
    for row in cursor.fetchall():
        print(row)

def delete_customer():
    try:
        cust_id = int(input("Enter Customer ID to delete: "))
        cursor.execute("DELETE FROM Customer WHERE cust_id = %s", (cust_id,))
        mydb.commit()
        print("Customer deleted.")
    except: print("Error deleting customer.")

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
        if choice == "1": view_books()
        elif choice == "2": buy_book(cust_id)
        elif choice == "3": view_purchase_history(cust_id)
        elif choice == "4": break
        else: print("Invalid choice.")

def view_books():
    cursor.execute("SELECT * FROM Books WHERE quantity > 0")
    for book in cursor.fetchall():
        print(book)

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
    except:
        print("Error during purchase.")

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
    else:
        try:
            cursor.execute("SELECT * FROM Authentication WHERE login_id=%s AND password=%s", (login_id, password))
            auth_result = cursor.fetchone()

            if auth_result:
                cursor.execute("SELECT cust_id FROM Customer WHERE login_id = %s", (login_id,))
                customer_result = cursor.fetchone()
                if customer_result:
                    customer_menu(customer_result[0])
                else:
                    print("No matching customer found for this login.")
            else:
                print("Invalid login credentials.")
        except Exception as e:
            print("Login error:", e)

# --- Main Loop ---
def main():
    while True:
        print("\n--- BOOKSTORE MANAGEMENT SYSTEM ---")
        print("1. Login")
        print("2. Exit")
        choice = input("Enter your choice: ")
        if choice == "1": login()
        elif choice == "2": break
        else: print("Invalid option.")

main()
