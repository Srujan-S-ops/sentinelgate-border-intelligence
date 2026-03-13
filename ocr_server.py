from flask import Flask, request, jsonify
from flask_cors import CORS
import pytesseract
import cv2
import numpy as np
import re

app = Flask(__name__)
CORS(app)

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

@app.route("/scan", methods=["POST"])
def scan_passport():

    file = request.files["image"]

    file_bytes = np.frombuffer(file.read(), np.uint8)

    img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    text = pytesseract.image_to_string(gray)

    # extract passport number pattern
    passport_match = re.search(r"[A-Z0-9]{6,9}", text)

    passport = passport_match.group() if passport_match else "UNKNOWN"

    # extract name line
    lines = text.split("\n")
    name = "Unknown Traveler"

    for line in lines:
        if line.isupper() and len(line) > 5:
            name = line
            break

    return jsonify({
        "name": name,
        "passport": passport
    })

if __name__ == "__main__":
    app.run(port=5000)