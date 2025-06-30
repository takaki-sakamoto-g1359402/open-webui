from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from utils.doc_parser import parse_file
from utils.ai_generator import generate_quiz

app = FastAPI()
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/", response_class=HTMLResponse)
async def create_quiz(request: Request, file: UploadFile = File(...)):
    text = await parse_file(file)
    if text is None:
        return templates.TemplateResponse(
            "index.html", {"request": request, "error": "未対応のファイル形式です"}
        )

    quiz = generate_quiz(text)
    return templates.TemplateResponse("index.html", {"request": request, "quiz": quiz})
