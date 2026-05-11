from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="MAQAM API", version="2.0")

# إعدادات السماح بالاتصال (CORS) لربط الواجهة بالسيرفر
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # في الإنتاج يفضل تحديد رابط الواجهة الخاص بك فقط
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LyricInput(BaseModel):
    text: str

@app.get("/")
async def root():
    return {"status": "online", "message": "MAQAM Backend is running successfully"}

@app.post("/analyze")
async def analyze_lyrics(input_data: LyricInput):
    if not input_data.text:
        raise HTTPException(status_code=400, detail="Text is required")
    
    # هنا تتم عمليات المعالجة اللغوية واللحنية مستقبلاً
    return {
        "analysis": "Success",
        "length": len(input_data.text),
        "message": "تم استلام النص ومعالجته بنجاح في مختبر مقام"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)