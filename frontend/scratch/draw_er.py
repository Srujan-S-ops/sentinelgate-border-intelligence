import os
from PIL import Image, ImageDraw, ImageFont

def draw_er_diagram():
    # Colors
    bg_color = (248, 250, 252) # Slate 50
    card_bg = (255, 255, 255) # White
    border_color = (226, 232, 240) # Slate 200
    text_color_primary = (15, 23, 42) # Slate 900
    text_color_secondary = (100, 116, 139) # Slate 500
    line_color = (79, 70, 229) # Indigo 600
    
    header_core = (79, 70, 229) # Indigo 600
    header_normal = (30, 41, 59) # Slate 800
    
    pk_bg = (209, 250, 229) # Emerald 100
    pk_border = (16, 185, 129) # Emerald 500
    pk_text = (5, 150, 105) # Emerald 600
    
    fk_bg = (219, 234, 254) # Blue 100
    fk_border = (59, 130, 246) # Blue 500
    fk_text = (37, 99, 235) # Blue 600
    
    uq_bg = (243, 232, 255) # Purple 100
    uq_border = (168, 85, 247) # Purple 500
    uq_text = (147, 51, 234) # Purple 600

    # Font loader helper
    def load_font(font_name, size, weight='regular'):
        font_folder = "C:\\Windows\\Fonts\\"
        font_files = {
            ('segoeui', 'regular'): 'segoeui.ttf',
            ('segoeui', 'bold'): 'segoeuib.ttf',
            ('arial', 'regular'): 'arial.ttf',
            ('arial', 'bold'): 'arialbd.ttf',
        }
        
        file_name = font_files.get((font_name, weight), 'arial.ttf')
        font_path = os.path.join(font_folder, file_name)
        if not os.path.exists(font_path):
            fallback_name = font_files.get(('arial', weight), 'arial.ttf')
            font_path = os.path.join(font_folder, fallback_name)
            
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
        return ImageFont.load_default()

    # Load fonts
    title_font = load_font('segoeui', 26, 'bold')
    subtitle_font = load_font('segoeui', 14, 'regular')
    table_title_font = load_font('segoeui', 13, 'bold')
    field_bold_font = load_font('segoeui', 11, 'bold')
    field_regular_font = load_font('segoeui', 11, 'regular')
    field_small_font = load_font('segoeui', 9, 'bold')
    legend_font = load_font('segoeui', 11, 'regular')

    # Dimensions
    img_w, img_h = 1500, 1100
    img = Image.new("RGBA", (img_w, img_h), bg_color)
    draw = ImageDraw.Draw(img)

    # Tables structure
    tables = {
        "users": {
            "name": "users",
            "is_core": False,
            "x": 100,
            "y": 454,
            "width": 320,
            "fields": [
                ("id", "UUID", "PK"),
                ("email", "TEXT", "UQ"),
                ("password", "TEXT", ""),
                ("role", "TEXT", ""),
                ("created_at", "TIMESTAMPTZ", ""),
                ("updated_at", "TIMESTAMPTZ", "")
            ]
        },
        "passengers": {
            "name": "passengers",
            "is_core": True,
            "x": 590,
            "y": 384,
            "width": 320,
            "fields": [
                ("id", "UUID", "PK"),
                ("user_id", "UUID", "FK"),
                ("name", "TEXT", ""),
                ("phone", "TEXT", ""),
                ("dob", "DATE", ""),
                ("nationality", "TEXT", ""),
                ("security_score", "NUMERIC", ""),
                ("security_status", "TEXT", ""),
                ("security_notes", "TEXT", ""),
                ("created_at", "TIMESTAMPTZ", ""),
                ("updated_at", "TIMESTAMPTZ", "")
            ]
        },
        "passport_verifications": {
            "name": "passport_verifications",
            "is_core": False,
            "x": 590,
            "y": 30,
            "width": 320,
            "fields": [
                ("id", "UUID", "PK"),
                ("passenger_id", "UUID", "FK_UQ"),
                ("passport_number", "TEXT", ""),
                ("issuing_country", "TEXT", ""),
                ("expiry_date", "DATE", ""),
                ("ocr_status", "TEXT", ""),
                ("verification_status", "TEXT", ""),
                ("created_at", "TIMESTAMPTZ", ""),
                ("updated_at", "TIMESTAMPTZ", "")
            ]
        },
        "face_enrollments": {
            "name": "face_enrollments",
            "is_core": False,
            "x": 590,
            "y": 794,
            "width": 320,
            "fields": [
                ("id", "UUID", "PK"),
                ("passenger_id", "UUID", "FK_UQ"),
                ("selfie_url", "TEXT", ""),
                ("face_descriptor", "TEXT", ""),
                ("quality_score", "NUMERIC", ""),
                ("liveness_status", "TEXT", ""),
                ("created_at", "TIMESTAMPTZ", ""),
                ("updated_at", "TIMESTAMPTZ", "")
            ]
        },
        "boarding_passes": {
            "name": "boarding_passes",
            "is_core": False,
            "x": 1080,
            "y": 328,
            "width": 320,
            "fields": [
                ("id", "UUID", "PK"),
                ("passenger_id", "UUID", "FK_UQ"),
                ("pnr", "TEXT", ""),
                ("flight_number", "TEXT", ""),
                ("departure_airport", "TEXT", ""),
                ("arrival_airport", "TEXT", ""),
                ("travel_date", "DATE", ""),
                ("boarding_time", "TEXT", ""),
                ("gate", "TEXT", ""),
                ("seat_number", "TEXT", ""),
                ("class", "TEXT", ""),
                ("egate_status", "TEXT", ""),
                ("boarding_status", "TEXT", ""),
                ("created_at", "TIMESTAMPTZ", ""),
                ("updated_at", "TIMESTAMPTZ", "")
            ]
        }
    }

    # Draw title
    title_text = "SENTINELGATE SMARTYATRA SCHEMA"
    subtitle_text = "Relational Entity-Relationship (E-R) Blueprint — All relationships enforce 1:1 Constraints"
    
    draw.text((100, 30), title_text, fill=(30, 41, 59), font=title_font)
    draw.text((100, 75), subtitle_text, fill=(100, 116, 139), font=subtitle_font)

    # Draw subtle background grid lines
    for grid_x in range(0, img_w, 100):
        draw.line((grid_x, 0, grid_x, img_h), fill=(241, 245, 249), width=1)
    for grid_y in range(0, img_h, 100):
        draw.line((0, grid_y, img_w, grid_y), fill=(241, 245, 249), width=1)

    # Store connection points: { table_name: { field_name: (left_x, right_x, y) } }
    connection_points = {}

    # Draw Tables
    header_height = 42
    row_height = 28
    
    for tname, tinfo in tables.items():
        x = tinfo["x"]
        y = tinfo["y"]
        w = tinfo["width"]
        fields = tinfo["fields"]
        is_core = tinfo["is_core"]
        
        num_fields = len(fields)
        height = header_height + num_fields * row_height + 10
        
        # Draw shadow
        draw.rounded_rectangle((x+3, y+3, x+w+3, y+height+3), radius=10, fill=(226, 232, 240, 100))
        
        # Draw table border & background
        draw.rounded_rectangle((x, y, x+w, y+height), radius=10, fill=card_bg, outline=border_color, width=2)
        
        # Draw header background
        header_fill = header_core if is_core else header_normal
        draw.rounded_rectangle((x, y, x+w, y+header_height), radius=10, fill=header_fill)
        # Flatten bottom corners of the header
        draw.rectangle((x, y+header_height-8, x+w, y+header_height), fill=header_fill)
        # Table name text
        table_title = tname.upper()
        if is_core:
            table_title += "  (CORE)"
        title_w = draw.textlength(table_title, font=table_title_font)
        draw.text((x + (w - title_w)//2, y + (header_height - 18)//2), table_title, fill=(255, 255, 255), font=table_title_font)
        
        # Store points for this table
        connection_points[tname] = {}
        
        # Draw fields
        curr_y = y + header_height + 4
        for idx, (fname, ftype, fkey) in enumerate(fields):
            is_pk = "PK" in fkey
            is_fk = "FK" in fkey
            is_uq = "UQ" in fkey
            
            # Save connection points coordinates (middle of the row vertically)
            field_mid_y = curr_y + row_height // 2
            connection_points[tname][fname] = (x, x + w, field_mid_y)
            
            badge_offset = 0
            # Draw badge if PK / FK / UQ
            if is_pk:
                badge_w = 24
                badge_h = 16
                by = curr_y + (row_height - badge_h)//2
                draw.rounded_rectangle((x + 12, by, x + 12 + badge_w, by + badge_h), radius=3, fill=pk_bg, outline=pk_border, width=1)
                draw.text((x + 16, by + 1), "PK", fill=pk_text, font=field_small_font)
                badge_offset = 32
            elif is_fk:
                # Can be FK or FK_UQ
                badge_text = "FK"
                bg, border, txt = fk_bg, fk_border, fk_text
                if is_uq:
                    badge_text = "FK"
                badge_w = 24
                badge_h = 16
                by = curr_y + (row_height - badge_h)//2
                draw.rounded_rectangle((x + 12, by, x + 12 + badge_w, by + badge_h), radius=3, fill=bg, outline=border, width=1)
                draw.text((x + 16, by + 1), badge_text, fill=txt, font=field_small_font)
                badge_offset = 32
            elif is_uq:
                badge_w = 24
                badge_h = 16
                by = curr_y + (row_height - badge_h)//2
                draw.rounded_rectangle((x + 12, by, x + 12 + badge_w, by + badge_h), radius=3, fill=uq_bg, outline=uq_border, width=1)
                draw.text((x + 16, by + 1), "UQ", fill=uq_text, font=field_small_font)
                badge_offset = 32
                
            # Draw field name
            f_font = field_bold_font if (is_pk or is_fk) else field_regular_font
            f_color = text_color_primary if (is_pk or is_fk) else (71, 85, 105)
            draw.text((x + 12 + badge_offset, curr_y + (row_height - 16)//2), fname, fill=f_color, font=f_font)
            
            # Draw field type
            type_w = draw.textlength(ftype, font=field_regular_font)
            draw.text((x + w - 12 - type_w, curr_y + (row_height - 16)//2), ftype, fill=text_color_secondary, font=field_regular_font)
            
            # Divider line between fields
            if idx < num_fields - 1:
                draw.line((x+8, curr_y+row_height, x+w-8, curr_y+row_height), fill=(241, 245, 249), width=1)
                
            curr_y += row_height

    # Relationships Lines Drawing Helper
    def draw_orthogonal_line(p1, p2, color, width=2):
        draw.line(p1, fill=color, width=width)
        draw.line(p2, fill=color, width=width)
        
    def draw_1to1_ticks_horizontal(draw, x, y, is_left_end=True, color=(79, 70, 229)):
        # Draws standard double tick marks denoting 1:1 relation
        offset = 5 if is_left_end else -5
        x1 = x + offset
        x2 = x + offset * 2
        # Vertical ticks
        draw.line((x1, y - 6, x1, y + 6), fill=color, width=2)
        draw.line((x2, y - 6, x2, y + 6), fill=color, width=2)

    # 1. users.id (PK) -> passengers.user_id (FK)
    # Right edge of users.id (420, 508)
    # Left edge of passengers.user_id (590, 466)
    u_pt = connection_points["users"]["id"]
    p_u_pt = connection_points["passengers"]["user_id"]
    
    # Path: (420, 508) -> (505, 508) -> (505, 466) -> (590, 466)
    draw.line([(u_pt[1], u_pt[2]), (505, u_pt[2]), (505, p_u_pt[2]), (p_u_pt[0], p_u_pt[2])], fill=line_color, width=2)
    # Relationship Ticks
    draw_1to1_ticks_horizontal(draw, u_pt[1], u_pt[2], is_left_end=True, color=line_color)
    draw_1to1_ticks_horizontal(draw, p_u_pt[0], p_u_pt[2], is_left_end=True, color=line_color)

    # 2. passengers.id (PK) -> passport_verifications.passenger_id (FK_UQ)
    # Left edge of passengers.id (590, 438)
    # Left edge of passport_verifications.passenger_id (590, 112)
    p_id_pt = connection_points["passengers"]["id"]
    pv_pass_pt = connection_points["passport_verifications"]["passenger_id"]
    
    # Path: (590, 438) -> (530, 438) -> (530, 112) -> (590, 112)
    draw.line([(p_id_pt[0], p_id_pt[2]), (530, p_id_pt[2]), (530, pv_pass_pt[2]), (pv_pass_pt[0], pv_pass_pt[2])], fill=line_color, width=2)
    draw_1to1_ticks_horizontal(draw, p_id_pt[0], p_id_pt[2], is_left_end=False, color=line_color)
    draw_1to1_ticks_horizontal(draw, pv_pass_pt[0], pv_pass_pt[2], is_left_end=False, color=line_color)

    # 3. passengers.id (PK) -> face_enrollments.passenger_id (FK_UQ)
    # Left edge of passengers.id (590, 438)
    # Left edge of face_enrollments.passenger_id (590, 876)
    fe_pass_pt = connection_points["face_enrollments"]["passenger_id"]
    
    # Path: (590, 438) -> (510, 438) -> (510, 876) -> (590, 876)
    draw.line([(p_id_pt[0], p_id_pt[2]), (510, p_id_pt[2]), (510, fe_pass_pt[2]), (fe_pass_pt[0], fe_pass_pt[2])], fill=line_color, width=2)
    draw_1to1_ticks_horizontal(draw, fe_pass_pt[0], fe_pass_pt[2], is_left_end=False, color=line_color)

    # 4. passengers.id (PK) -> boarding_passes.passenger_id (FK_UQ)
    # Right edge of passengers.id (910, 438)
    # Left edge of boarding_passes.passenger_id (1080, 410)
    bp_pass_pt = connection_points["boarding_passes"]["passenger_id"]
    
    # Path: (910, 438) -> (995, 438) -> (995, 410) -> (1080, 410)
    draw.line([(p_id_pt[1], p_id_pt[2]), (995, p_id_pt[2]), (995, bp_pass_pt[0]), (bp_pass_pt[0], bp_pass_pt[2])], fill=line_color, width=2)
    draw_1to1_ticks_horizontal(draw, p_id_pt[1], p_id_pt[2], is_left_end=True, color=line_color)
    draw_1to1_ticks_horizontal(draw, bp_pass_pt[0], bp_pass_pt[2], is_left_end=True, color=line_color)

    # Draw Legend at bottom
    legend_y = 1010
    legend_x = 100
    
    # Legend title
    draw.text((legend_x, legend_y - 25), "DIAGRAM LEGEND", fill=(30, 41, 59), font=table_title_font)
    
    # PK Badge
    draw.rounded_rectangle((legend_x, legend_y, legend_x + 30, legend_y + 18), radius=3, fill=pk_bg, outline=pk_border)
    draw.text((legend_x + 6, legend_y + 2), "PK", fill=pk_text, font=field_small_font)
    draw.text((legend_x + 40, legend_y + 1), "Primary Key", fill=text_color_primary, font=legend_font)
    
    # FK Badge
    legend_x += 160
    draw.rounded_rectangle((legend_x, legend_y, legend_x + 30, legend_y + 18), radius=3, fill=fk_bg, outline=fk_border)
    draw.text((legend_x + 6, legend_y + 2), "FK", fill=fk_text, font=field_small_font)
    draw.text((legend_x + 40, legend_y + 1), "Foreign Key", fill=text_color_primary, font=legend_font)

    # UQ Badge
    legend_x += 160
    draw.rounded_rectangle((legend_x, legend_y, legend_x + 30, legend_y + 18), radius=3, fill=uq_bg, outline=uq_border)
    draw.text((legend_x + 6, legend_y + 2), "UQ", fill=uq_text, font=field_small_font)
    draw.text((legend_x + 40, legend_y + 1), "Unique Constraint", fill=text_color_primary, font=legend_font)

    # Relationship line example
    legend_x += 190
    draw.line((legend_x, legend_y + 9, legend_x + 40, legend_y + 9), fill=line_color, width=2)
    # Double ticks
    draw.line((legend_x + 10, legend_y + 3, legend_x + 10, legend_y + 15), fill=line_color, width=2)
    draw.line((legend_x + 15, legend_y + 3, legend_x + 15, legend_y + 15), fill=line_color, width=2)
    
    draw.text((legend_x + 50, legend_y + 1), "1-to-1 Relationship Constraint (Unique Foreign Key)", fill=text_color_primary, font=legend_font)

    # Save to artifacts directory
    output_dir = r"C:\Users\salma\.gemini\antigravity-ide\brain\e85ebb6b-41c1-4924-b372-b65be0831fb5"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, "er_diagram_professional.png")
    
    # Save image (converting to RGB to ensure DOCX compatibility)
    rgb_img = Image.new("RGB", img.size, (248, 250, 252))
    rgb_img.paste(img, mask=img.split()[3]) # alpha channel as mask
    rgb_img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Professional E-R diagram successfully saved to: {output_path}")

if __name__ == "__main__":
    draw_er_diagram()
