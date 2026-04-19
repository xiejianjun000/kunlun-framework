/**
 * UUID Mock for Jest Testing
 */

let counter = 0;

export function v4(): string {
  counter++;
  return `mock-uuid-${counter}-${Date.now()}`;
}

export function v1(): string {
  counter++;
  return `mock-uuid-v1-${counter}-${Date.now()}`;
}

export default { v4, v1 };
