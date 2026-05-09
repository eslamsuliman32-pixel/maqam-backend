from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# هذا الجزء يسمح لموقعك بالاتصال بالخادم
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextData(BaseModel):
    content: str

@app.post("/analyze")
async def analyze_text(data: TextData):
    # هنا سنضع لاحقاً معادلاتك الرياضية، حالياً نعيد نتيجة تجريبية
    return {
        "score": 85,
        "msg": "تم الاتصال بنجاح بمحرك مقام"
    }

@app.get("/")
async def health_check():
    return {"status": "online"}
