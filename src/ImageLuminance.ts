type Rect = { x: number, y: number, width: number, height: number };

export class ImageLuminance {
  readonly data: Float32Array;
  readonly height: number;
  readonly width: number;

  constructor(readonly dataUrl: string, data: ImageData) {
    this.width = data.width;
    this.height = data.height;
    this.data = new Float32Array(this.width * this.height);
    for (let i = 0; i < this.data.length; i++) {
      const offset = i * 4;
      const a = data.data[offset + 3] / 255;
      const v = mix(data.data[offset], 0xff, a) + mix(data.data[offset + 1], 0xff, a) + mix(data.data[offset + 2], 0xff, a);
      this.data[i] = v / (3 * 255);
    }
  }

  get(x: number, y: number): number {
    return this.data[Math.floor(y) * this.width + Math.floor(x)];
  }

  average(rect: Rect = {
    x: 0,
    y: 0,
    width: this.width,
    height: this.height
  }): number {
    let total = 0;
    let count = 0;
    const maxX = Math.min(rect.x + rect.width, this.width);
    const maxY = Math.min(rect.y + rect.height, this.height);
    for (let y = rect.y; y < maxY; y++) {
      for (let x = rect.x; x < maxX; x++) {
        total += this.get(x, y);
        count += 1;
      }
    }
    return total / count;
  }

}

function mix(a: number, b: number, f: number): number {
  return f * a + (1 - f) * b;
}
