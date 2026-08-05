import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminProductFormProps } from "./types";

const CATEGORY_OTHER = "__category_other__";
const SUBCATEGORY_OTHER = "__subcategory_other__";

function handleInput(
  setter: (v: Record<string, unknown>) => void,
  current: Record<string, unknown>,
) {
  return (e: React.ChangeEvent<HTMLInputElement>) =>
    setter({ ...current, [e.target.name]: e.target.value });
}

function handleSelect(
  setter: (v: Record<string, unknown>) => void,
  current: Record<string, unknown>,
  key: string,
  val: string,
) {
  setter({ ...current, [key]: val === "true" ? true : val === "false" ? false : val });
}

export default function ProductFormFields({
  data,
  setData,
  categoryOptions,
}: AdminProductFormProps) {
  const selectedCategory = (data.category as string) ?? "";
  const subcategories =
    categoryOptions?.find((c) => c.name === selectedCategory)?.subcategories ?? [];

  const [categoryOtherMode, setCategoryOtherMode] = useState(
    () =>
      !!selectedCategory && !(categoryOptions?.some((c) => c.name === selectedCategory) ?? false),
  );
  const [subcategoryOtherMode, setSubcategoryOtherMode] = useState(
    () => !!data.subcategory && !subcategories.includes(data.subcategory as string),
  );

  const handleCategoryChange = (v: string) => {
    if (v === CATEGORY_OTHER) {
      setCategoryOtherMode(true);
      setSubcategoryOtherMode(false);
      setData({ ...data, subcategory: "" });
      return;
    }
    setCategoryOtherMode(false);
    setSubcategoryOtherMode(false);
    setData({ ...data, category: v, subcategory: "" });
  };

  const handleSubcategoryChange = (v: string) => {
    if (v === SUBCATEGORY_OTHER) {
      setSubcategoryOtherMode(true);
      return;
    }
    setSubcategoryOtherMode(false);
    setData({ ...data, subcategory: v === "__none__" ? "" : v });
  };

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" value={data.name as string} onChange={handleInput(setData, data)} />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          {categoryOptions ? (
            <>
              <Select
                value={categoryOtherMode ? CATEGORY_OTHER : selectedCategory}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CATEGORY_OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
              {categoryOtherMode && (
                <Input
                  name="category"
                  placeholder="Enter custom category"
                  value={selectedCategory}
                  onChange={handleInput(setData, data)}
                />
              )}
            </>
          ) : (
            <Input name="category" value={selectedCategory} onChange={handleInput(setData, data)} />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Subcategory</Label>
          {categoryOptions ? (
            <>
              <Select
                value={
                  subcategoryOtherMode
                    ? SUBCATEGORY_OTHER
                    : ((data.subcategory as string) ?? "") || "__none__"
                }
                onValueChange={handleSubcategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {subcategories.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value={SUBCATEGORY_OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
              {subcategoryOtherMode && (
                <Input
                  name="subcategory"
                  placeholder="Enter custom subcategory"
                  value={(data.subcategory as string) ?? ""}
                  onChange={handleInput(setData, data)}
                />
              )}
            </>
          ) : (
            <Input
              name="subcategory"
              value={(data.subcategory as string) ?? ""}
              onChange={handleInput(setData, data)}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label>Badge</Label>
          <Input
            name="badge"
            value={(data.badge as string) ?? ""}
            onChange={handleInput(setData, data)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Input
          name="description"
          value={data.description as string}
          onChange={handleInput(setData, data)}
        />
      </div>
      <div className="space-y-1">
        <Label>Image URL</Label>
        <Input
          name="imageUrl"
          value={data.imageUrl as string}
          onChange={handleInput(setData, data)}
        />
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Price</Label>
          <Input name="price" value={data.price as string} onChange={handleInput(setData, data)} />
        </div>
        <div className="space-y-1">
          <Label>Original Price</Label>
          <Input
            name="originalPrice"
            value={(data.originalPrice as string) ?? ""}
            onChange={handleInput(setData, data)}
          />
        </div>
        <div className="space-y-1">
          <Label>Stock Qty</Label>
          <Input
            type="number"
            name="stockQuantity"
            min={0}
            value={(data.stockQuantity as number) ?? 0}
            onChange={(e) => setData({ ...data, stockQuantity: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {(["inStock", "featured", "newArrival"] as const).map((key) => (
          <div key={key} className="space-y-1">
            <Label>
              {key === "inStock" ? "In Stock" : key === "featured" ? "Featured" : "New Arrival"}
            </Label>
            <Select
              value={String(data[key] ?? false)}
              onValueChange={(v) => handleSelect(setData, data, key, v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
