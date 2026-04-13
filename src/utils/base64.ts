// Base64 encoding/decoding utilities for BLE communication

export const encode = (str: string): string => {
  return btoa(str);
};

export const decode = (base64: string): string => {
  return atob(base64);
};

export const encodeJSON = <T>(data: T): string => {
  return btoa(JSON.stringify(data));
};

export const decodeJSON = <T>(base64: string): T => {
  return JSON.parse(atob(base64));
};
