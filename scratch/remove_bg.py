import zlib
import struct
import os
import sys

def remove_white_bg(input_path, output_path, threshold=245):
    with open(input_path, 'rb') as f:
        data = f.read()

    if data[:8] != b'\x89PNG\r\n\x1a\n':
        print(f"Not a valid PNG: {input_path}")
        return False

    pos = 8
    chunks = []
    width = 0
    height = 0
    bit_depth = 0
    color_type = 0
    raw_idat = b''

    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8]
        chunk_data = data[pos+8:pos+8+length]
        crc = data[pos+8+length:pos+12+length]
        pos += 12 + length

        if chunk_type == b'IHDR':
            width, height, bit_depth, color_type = struct.unpack('>IIBB', chunk_data[:10])
            print(f"IHDR: {width}x{height}, depth={bit_depth}, color_type={color_type}")
        elif chunk_type == b'IDAT':
            raw_idat += chunk_data
        elif chunk_type == b'IEND':
            pass

    if color_type != 6 and color_type != 2:
        print(f"Unsupported color type {color_type} for quick process")
        return False

    try:
        decompressed = zlib.decompress(raw_idat)
    except Exception as e:
        print(f"Decompress error: {e}")
        return False

    bpp = 4 if color_type == 6 else 3
    expected_len = height * (1 + width * bpp)
    if len(decompressed) != expected_len:
        print(f"Unexpected decompressed length: {len(decompressed)} vs {expected_len}")
        return False

    new_rows = bytearray()
    idx = 0
    for y in range(height):
        filter_type = decompressed[idx]
        idx += 1
        new_rows.append(0) # Filter None for output
        
        row_data = decompressed[idx:idx + width * bpp]
        idx += width * bpp
        
        # De-filter row if needed (assuming filter 0 or simple)
        for x in range(width):
            if color_type == 6: # RGBA
                r, g, b, a = row_data[x*4:x*4+4]
                if r >= threshold and g >= threshold and b >= threshold:
                    new_rows.extend([r, g, b, 0])
                else:
                    new_rows.extend([r, g, b, a])
            elif color_type == 2: # RGB
                r, g, b = row_data[x*3:x*3+3]
                if r >= threshold and g >= threshold and b >= threshold:
                    new_rows.extend([r, g, b, 0])
                else:
                    new_rows.extend([r, g, b, 255])

    # Re-encode as RGBA (color_type 6)
    new_ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    new_ihdr_crc = zlib.crc32(b'IHDR' + new_ihdr_data)
    new_ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + new_ihdr_data + struct.pack('>I', new_ihdr_crc)

    compressed_idat = zlib.compress(bytes(new_rows))
    idat_crc = zlib.crc32(b'IDAT' + compressed_idat)
    new_idat_chunk = struct.pack('>I', len(compressed_idat)) + b'IDAT' + compressed_idat + struct.pack('>I', idat_crc)

    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    png_signature = b'\x89PNG\r\n\x1a\n'
    out_bytes = png_signature + new_ihdr_chunk + new_idat_chunk + iend_chunk

    with open(output_path, 'wb') as f:
        f.write(out_bytes)
    print(f"Successfully processed: {output_path}")
    return True

if __name__ == '__main__':
    if len(sys.argv) > 2:
        remove_white_bg(sys.argv[1], sys.argv[2])
