import asyncio
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/logs", tags=["logs"])

LOG_FILE = "backend.log"

async def log_generator():
    if not os.path.exists(LOG_FILE):
        # Create empty log file if it doesn't exist
        open(LOG_FILE, 'a').close()

    # Initial position at the end of the file
    file = open(LOG_FILE, 'r')
    file.seek(0, os.SEEK_END)
    
    try:
        while True:
            line = file.readline()
            if not line:
                await asyncio.sleep(0.5)
                continue
            yield f"data: {line}\n\n"
    except asyncio.CancelledError:
        file.close()
    except Exception as e:
        yield f"data: Error streaming logs: {str(e)}\n\n"
        file.close()

@router.get("/stream")
async def stream_logs():
    return StreamingResponse(log_generator(), media_type="text/event-stream")
