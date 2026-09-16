"""File storage: local disk by default, S3 when S3_BUCKET is set.
Returns a URL the browser can load (CloudFront/S3 URL, or /uploads/... locally)."""
import os

from ..config import settings


def save_file(key: str, data: bytes, content_type: str) -> str:
    if settings.s3_bucket:
        import boto3  # only needed in production
        s3 = boto3.client("s3", region_name=settings.aws_region or None)
        s3.put_object(Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type, CacheControl="public, max-age=31536000, immutable")
        base = settings.s3_public_url.rstrip("/") if settings.s3_public_url else f"https://{settings.s3_bucket}.s3.{settings.aws_region or 'us-east-1'}.amazonaws.com"
        return f"{base}/{key}"
    path = os.path.join(settings.uploads_dir, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return f"/uploads/{key}"
