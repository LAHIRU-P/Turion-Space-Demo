#Using lightwight python image for space constrains 
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

#create non-root user
RUN adduser --disabled-password --gecos "" appuser
WORKDIR /app
COPY webapp/requirements.txt .
#pip upgrate + install packages listed in requirements file
RUN python -m pip install --upgrade pip && pip install -r requirements.txt
COPY webapp/ /app/
EXPOSE 8080
USER appuser
# run webapp with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "app:app"]