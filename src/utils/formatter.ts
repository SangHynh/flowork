/**
 * Utility to format and manipulate agent responses for Telegram.
 */
export class ResponseFormatter {
  private static readonly MAX_LENGTH = 4000; // Telegram limit is 4096, keeping a safety margin

  /**
   * Simple Markdown (Legacy) formatter.
   * Legacy Markdown is more forgiving than MarkdownV2 on Telegram.
   * It handles *, _, `, and [link](url).
   */
  static format(text: string): { text: string; parse_mode: 'Markdown' } {
    // Current simple approach is to use standard Markdown
    // We can add more complex cleaning if needed (e.g. escaping unclosed symbols)
    return {
      text: text,
      parse_mode: 'Markdown',
    };
  }

  /**
   * Splits a long response into chunks compatible with Telegram limits.
   */
  static split(text: string): string[] {
    if (text.length <= this.MAX_LENGTH) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= this.MAX_LENGTH) {
        chunks.push(remaining);
        break;
      }

      // Try to find a good split point (newline or space)
      let splitIdx = remaining.lastIndexOf('\n', this.MAX_LENGTH);
      if (splitIdx === -1 || splitIdx < this.MAX_LENGTH * 0.5) {
        splitIdx = remaining.lastIndexOf(' ', this.MAX_LENGTH);
      }

      // If no good split point found, just hard cut
      if (splitIdx === -1 || splitIdx === 0) {
        splitIdx = this.MAX_LENGTH;
      }

      chunks.push(remaining.substring(0, splitIdx));
      remaining = remaining.substring(splitIdx).trim();
    }

    return chunks;
  }

  /**
   * Detects local paths in the text.
   * Helpful for showing "View Folder" or "View File" buttons later.
   */
  static extractPaths(text: string): string[] {
    // Regex for Windows paths like C:\foo\bar or e:\abc
    const winPathRegex = /[a-zA-Z]:\\[\\\w\s.-]+/g;
    const matches = text.match(winPathRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Detects simple filenames (e.g. index.html) likely mentioned by AI.
   */
  static extractFilenames(text: string): string[] {
    // Matches patterns like my-file.ts or index.html (word boundary, alphanumeric/dashes/dots)
    // Avoid things that look like numbers (e.g. 1.1) or too short
    const fileRegex = /\b[\w-]+\.[a-zA-Z]{1,10}\b/g;
    const matches = text.match(fileRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }
}
