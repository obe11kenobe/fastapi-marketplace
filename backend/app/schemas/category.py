from pydantic import BaseModel, Field

class CategoryBase(BaseModel):
    name: str =Field(..., min_length=5, max_length=100,
                     description="Category name")
    slug: str = Field(..., min_length=5, max_length=100,
                      description="URl-friendly category name")


class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int = Field (..., description="Unique category if")

    class Config:
        form_attributes = True