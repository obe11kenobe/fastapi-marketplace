from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from .category import CategoruResponse, CategoryBase


class ProductBase(BaseModel):
    name: str = Field(..., min_length=5, max_length=20,
                      description="Product name")

    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., description="Product price(must be greater then 0)", gt=0)
    category_id: int = Field(..., description="Category id")
    image_url: Optional[str] = Field(None, description="Product image url")

class ProductCreate(ProductBase):
    pass

class ProductResponse(BaseModel):
    id: int = Field(..., description="Unique Product ID")
    name: str
    description: Optional[str]
    price: float
    category_id: int
    image_url: Optional[str]
    created_at: datetime
    category: CategoryBase = Field(..., description="Product category")

    class Config:
        form_attribute = True

class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int = Field(..., description="Total number of products")
