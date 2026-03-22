import { Runner } from "./runner.js";
import { DAG } from "../types/index.js";
import { CONFIG } from "../config/index.js";

const PLANNER_SYSTEM_PROMPT = `
Bạn là Kiến trúc sư trưởng của Flowork. Nhiệm vụ của bạn là hỗ trợ người dùng bằng cách giải đáp thắc mắc, tư vấn hoặc lập kế hoạch thực thi công việc.

PHƯƠNG CHỨC HOẠT ĐỘNG:
1. TRÒ CHUYỆN: Nếu người dùng hỏi thăm hoặc thắc mắc, hãy trả lời tự nhiên bằng TIẾNG VIỆT (Markdown). Hãy thân thiện và chuyên nghiệp.
2. THỰC THI: Nếu người dùng đưa ra một nhiệm vụ rõ ràng, hãy GIẢI THÍCH cách bạn sẽ làm trước, sau đó đính kèm một khối JSON đại diện cho Kế hoạch (DAG) bên dưới.

CẤU TRÚC KẾ HOẠCH (nếu cần thực thi):
{
  "phases": [
    {
      "id": 1,
      "tasks": [
        {
          "id": "task-1",
          "agent": "${CONFIG.WORKFLOW.MODELS.DEFAULT}",
          "description": "Mô tả ngắn bằng Tiếng Việt",
          "prompt": "Chi tiết yêu cầu cho Agent (có thể dùng Tiếng Anh để agent hiểu tốt hơn)",
          "depends_on": [],
          "critical": true
        }
      ]
    }
  ]
}

QUY TẮC:
- Luôn sử dụng thư mục '${CONFIG.WORKFLOW.FACTORY_PATH}' cho mọi sản phẩm tạo ra.
- Sử dụng '${CONFIG.WORKFLOW.MATERIAL_PATH}' cho các tài liệu đầu vào.
- Sau khi xong, hãy nhắc người dùng dùng lệnh '/ship' để nhận hàng và '/shot' để xem ảnh màn hình.
- CHỈ xuất JSON khi có yêu cầu làm việc thực sự. Viết phần giải thích kế hoạch bằng TIẾNG VIỆT trước khi có JSON.
- TRUNG THỰC: Nếu không thể thực hiện yêu cầu, hãy báo rõ lý do cụ thể. KHÔNG tự ý thay đổi hoặc đơn giản hóa yêu cầu mà không hỏi người dùng.
- BÁO LỖI: Nếu gặp lỗi hoặc không chắc chắn, hãy mô tả vấn đề rõ ràng và đề xuất người dùng liên hệ hỗ trợ thay vì tự đoán.
`;

export interface PlannerResult {
  text: string;
  dag?: DAG;
  executionTimeMs: number;
}

export class Planner {
  static async generateDAG(userInput: string): Promise<PlannerResult> {
    const fullPrompt = `${PLANNER_SYSTEM_PROMPT}\n\nUser Request: "${userInput}"`;

    const start = Date.now();
    const rawOutput = await Runner.run(fullPrompt, {
      resume: false,
    });
    const duration = Date.now() - start;

    const result = this.parseResponse(rawOutput);
    return { ...result, executionTimeMs: duration };
  }

  private static parseResponse(raw: string): Omit<PlannerResult, "executionTimeMs"> {
    const jsonStr = this.extractJSON(raw);
    if (!jsonStr) {
      return { text: raw.trim() };
    }

    try {
      const dag = JSON.parse(jsonStr);
      // Remove the JSON string from the text to get only the explanation
      const explanation = raw
        .replace(jsonStr, "")
        .replace(/```json|```/g, "")
        .trim();
      return { text: explanation || "Đang lập kế hoạch thực hiện:", dag };
    } catch (error: unknown) {
      console.warn("Tìm thấy cấu trúc giống JSON nhưng không thể phân tích DAG:", error);
      return { text: raw.trim() };
    }
  }

  private static extractJSON(raw: string): string | null {
    // 1. Try to find a JSON block with fences
    const match = raw.match(/```json\s*(\{[\s\S]*?\})\s*```/i);
    if (match) return match[1].trim();

    // 2. Try generic code block fences
    const genericMatch = raw.match(/```\s*(\{[\s\S]*?\})\s*```/);
    if (genericMatch) return genericMatch[1].trim();

    // 3. Fallback: find the first { and the balanced last }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = raw.slice(start, end + 1);
      if (candidate.includes('"phases"')) {
        return candidate.trim();
      }
    }

    return null;
  }
}
