import zlib
import struct
import math

def create_png(width, height, filename):
    # Generar imagen RGBA
    raw_data = bytearray()
    center_x = width / 2
    center_y = height / 2
    radius = width / 2 - 4

    for y in range(height):
        raw_data.append(0)  # Filtro PNG tipo 0 (None)
        for x in range(width):
            dx = x - center_x
            dy = y - center_y
            dist = math.sqrt(dx * dx + dy * dy)

            if dist <= radius:
                # Fondo circular con gradiente azul-índigo
                t = (x + y) / (width + height)
                r = int(30 + t * 40)
                g = int(27 + t * 30)
                b = int(75 + t * 140)
                a = 255
                
                # Campana esquematizada en el centro
                # Coordenadas normalizadas (-1 a 1)
                nx = dx / (radius * 0.6)
                ny = dy / (radius * 0.6)
                
                # Forma de campana simple
                is_bell = False
                if -0.7 <= ny <= 0.4:
                    flare = 0.2 + 0.5 * ((ny + 0.7) / 1.1) ** 2
                    if abs(nx) <= flare:
                        is_bell = True
                elif 0.4 < ny <= 0.55:
                    if abs(nx) <= 0.75:
                        is_bell = True
                elif 0.55 < ny <= 0.75:
                    # badajo de la campana
                    if abs(nx) <= 0.2:
                        is_bell = True
                elif -0.85 <= ny < -0.7:
                    # asa superior
                    if abs(nx) <= 0.15:
                        is_bell = True

                if is_bell:
                    r, g, b = 245, 158, 11  # Dorado (#f59e0b)
            else:
                r, g, b, a = 0, 0, 0, 0

            raw_data.extend([r, g, b, a])

    compressed = zlib.compress(bytes(raw_data), 9)

    def chunk(tag, data):
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return length + tag + data + crc

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Creado: {filename} ({width}x{height})")

if __name__ == '__main__':
    create_png(192, 192, 'icon-192.png')
    create_png(512, 512, 'icon-512.png')
