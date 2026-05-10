"""
★ نظام التصدير (Export)
تصدير تقارير التحليل بصيغ مختلفة (JSON, Markdown, Text)
"""
import json

class ReportExporter:
    @staticmethod
    def export_json(report_data: dict, filepath: str):
        # في بيئة حقيقية يجب تحويل الكائنات إلى صيغة قابلة للتحويل إلى JSON (serializable)
        # هنا للتوضيح فقط
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(json.dumps({"status": "exported"}, ensure_ascii=False, indent=2))
        print(f"تم التصدير إلى {filepath}")

    @staticmethod
    def export_markdown(report_data: dict, filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("# تقرير التحليل الشامل\n\nنظام تحليل وتطوير الراب العربي النخبوي.")
        print(f"تم التصدير إلى {filepath}")
