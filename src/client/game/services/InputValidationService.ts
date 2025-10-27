/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Centralized service for user input validation
 * Handles validation of user inputs, form data, and user interactions
 */
export class InputValidationService {
  /**
   * Validates level name input
   * @param name - The level name to validate
   * @returns ValidationResult
   */
  validateLevelName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { isValid: false, message: 'Level name is required' };
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return { isValid: false, message: 'Level name cannot be empty' };
    }

    if (trimmedName.length < 3) {
      return { isValid: false, message: 'Level name must be at least 3 characters long' };
    }

    if (trimmedName.length > 50) {
      return { isValid: false, message: 'Level name must be less than 50 characters' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return { isValid: false, message: 'Level name contains invalid characters' };
    }

    return { isValid: true, message: 'Level name is valid' };
  }

  /**
   * Validates author name input
   * @param author - The author name to validate
   * @returns ValidationResult
   */
  validateAuthorName(author: string): ValidationResult {
    if (!author || typeof author !== 'string') {
      return { isValid: false, message: 'Author name is required' };
    }

    const trimmedAuthor = author.trim();
    if (trimmedAuthor.length === 0) {
      return { isValid: false, message: 'Author name cannot be empty' };
    }

    if (trimmedAuthor.length < 2) {
      return { isValid: false, message: 'Author name must be at least 2 characters long' };
    }

    if (trimmedAuthor.length > 30) {
      return { isValid: false, message: 'Author name must be less than 30 characters' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedAuthor)) {
      return { isValid: false, message: 'Author name contains invalid characters' };
    }

    return { isValid: true, message: 'Author name is valid' };
  }

  /**
   * Validates numeric input
   * @param value - The value to validate
   * @param min - Minimum allowed value
   * @param max - Maximum allowed value
   * @param fieldName - Name of the field for error messages
   * @returns ValidationResult
   */
  validateNumericInput(value: number, min: number, max: number, fieldName: string = 'Value'): ValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
      return { isValid: false, message: `${fieldName} must be a valid number` };
    }

    if (value < min) {
      return { isValid: false, message: `${fieldName} must be at least ${min}` };
    }

    if (value > max) {
      return { isValid: false, message: `${fieldName} must be at most ${max}` };
    }

    return { isValid: true, message: `${fieldName} is valid` };
  }

  /**
   * Validates coordinate input
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param maxX - Maximum X value
   * @param maxY - Maximum Y value
   * @returns ValidationResult
   */
  validateCoordinates(x: number, y: number, maxX: number, maxY: number): ValidationResult {
    const xValidation = this.validateNumericInput(x, 0, maxX - 1, 'X coordinate');
    if (!xValidation.isValid) {
      return xValidation;
    }

    const yValidation = this.validateNumericInput(y, 0, maxY - 1, 'Y coordinate');
    if (!yValidation.isValid) {
      return yValidation;
    }

    return { isValid: true, message: 'Coordinates are valid' };
  }

  /**
   * Validates string input with length constraints
   * @param value - The string value to validate
   * @param minLength - Minimum length
   * @param maxLength - Maximum length
   * @param fieldName - Name of the field for error messages
   * @param allowEmpty - Whether empty strings are allowed
   * @returns ValidationResult
   */
  validateStringInput(
    value: string, 
    minLength: number, 
    maxLength: number, 
    fieldName: string = 'Input',
    allowEmpty: boolean = false
  ): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: false, message: `${fieldName} is required` };
    }

    const trimmedValue = value.trim();
    
    if (!allowEmpty && trimmedValue.length === 0) {
      return { isValid: false, message: `${fieldName} cannot be empty` };
    }

    if (trimmedValue.length < minLength) {
      return { isValid: false, message: `${fieldName} must be at least ${minLength} characters long` };
    }

    if (trimmedValue.length > maxLength) {
      return { isValid: false, message: `${fieldName} must be less than ${maxLength} characters` };
    }

    return { isValid: true, message: `${fieldName} is valid` };
  }

  /**
   * Validates email input (if needed for future features)
   * @param email - The email to validate
   * @returns ValidationResult
   */
  validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, message: 'Email is required' };
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      return { isValid: false, message: 'Email cannot be empty' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }

    if (trimmedEmail.length > 254) {
      return { isValid: false, message: 'Email address is too long' };
    }

    return { isValid: true, message: 'Email is valid' };
  }

  /**
   * Validates file name input
   * @param fileName - The file name to validate
   * @returns ValidationResult
   */
  validateFileName(fileName: string): ValidationResult {
    if (!fileName || typeof fileName !== 'string') {
      return { isValid: false, message: 'File name is required' };
    }

    const trimmedFileName = fileName.trim();
    if (trimmedFileName.length === 0) {
      return { isValid: false, message: 'File name cannot be empty' };
    }

    if (trimmedFileName.length > 255) {
      return { isValid: false, message: 'File name is too long' };
    }

    // Check for invalid characters in file names
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(trimmedFileName)) {
      return { isValid: false, message: 'File name contains invalid characters' };
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExtension = trimmedFileName.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExtension)) {
      return { isValid: false, message: 'File name is reserved' };
    }

    return { isValid: true, message: 'File name is valid' };
  }

  /**
   * Validates URL input (if needed for future features)
   * @param url - The URL to validate
   * @returns ValidationResult
   */
  validateUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, message: 'URL is required' };
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      return { isValid: false, message: 'URL cannot be empty' };
    }

    try {
      new URL(trimmedUrl);
      return { isValid: true, message: 'URL is valid' };
    } catch {
      return { isValid: false, message: 'Please enter a valid URL' };
    }
  }

  /**
   * Validates boolean input
   * @param value - The value to validate
   * @param fieldName - Name of the field for error messages
   * @returns ValidationResult
   */
  validateBooleanInput(value: boolean, fieldName: string = 'Value'): ValidationResult {
    if (typeof value !== 'boolean') {
      return { isValid: false, message: `${fieldName} must be true or false` };
    }

    return { isValid: true, message: `${fieldName} is valid` };
  }

  /**
   * Validates array input
   * @param value - The array to validate
   * @param minLength - Minimum array length
   * @param maxLength - Maximum array length
   * @param fieldName - Name of the field for error messages
   * @returns ValidationResult
   */
  validateArrayInput(value: unknown[], minLength: number, maxLength: number, fieldName: string = 'Array'): ValidationResult {
    if (!Array.isArray(value)) {
      return { isValid: false, message: `${fieldName} must be an array` };
    }

    if (value.length < minLength) {
      return { isValid: false, message: `${fieldName} must have at least ${minLength} items` };
    }

    if (value.length > maxLength) {
      return { isValid: false, message: `${fieldName} must have at most ${maxLength} items` };
    }

    return { isValid: true, message: `${fieldName} is valid` };
  }
}
