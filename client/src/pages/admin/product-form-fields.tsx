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

export default function ProductFormFields({ data, setData }: AdminProductFormProps) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" value={data.name as string} onChange={handleInput(setData, data)} />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Input
            name="category"
            value={data.category as string}
            onChange={handleInput(setData, data)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Subcategory</Label>
          <Input
            name="subcategory"
            value={(data.subcategory as string) ?? ""}
            onChange={handleInput(setData, data)}
          />
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
