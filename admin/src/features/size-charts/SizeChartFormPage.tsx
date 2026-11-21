import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { ApiResponse, Brand, SizeChart, SizeChartField, SizeChartRow } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';

const DEFAULT_FIELDS: Record<string, SizeChartField[]> = {
  women_tops: [
    { id: 'bust', label: 'Bust', instruction: 'Measure around the fullest part of your bust.' },
    { id: 'waist', label: 'Waist', instruction: 'Measure around the narrowest part of your waist.' },
  ],
  women_bottoms: [
    { id: 'waist', label: 'Waist', instruction: 'Measure around the narrowest part of your waist.' },
    { id: 'hips', label: 'Hips', instruction: 'Measure around the fullest part of your seat.' },
  ],
  women_dresses: [
    { id: 'bust', label: 'Bust', instruction: 'Measure around the fullest part of your bust.' },
    { id: 'waist', label: 'Waist', instruction: 'Measure around the narrowest part of your waist.' },
    { id: 'hips', label: 'Hips', instruction: 'Measure around the fullest part of your seat.' },
  ],
  men_tops: [
    { id: 'chest', label: 'Chest', instruction: 'Measure around the widest part of your chest under arms.' },
  ],
  men_bottoms: [
    { id: 'waist', label: 'Waist', instruction: 'Measure around the narrowest part of your waist.' },
  ],
  kids_tops: [
    { id: 'chest', label: 'Chest', instruction: 'Measure around the widest part of the chest.' },
    { id: 'waist', label: 'Waist', instruction: 'Measure around the natural waistline.' },
    { id: 'hips', label: 'Hips', instruction: 'Measure around the fullest part of the seat.' },
  ],
  kids_bottoms: [
    { id: 'height', label: 'Height', instruction: 'Measure from head top to floor without shoes.' },
    { id: 'waist', label: 'Waist', instruction: 'Measure around the natural waistline.' },
    { id: 'hips', label: 'Hips', instruction: 'Measure around the fullest part of the seat.' },
  ],
};

export function SizeChartFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<string>('');
  const [gender, setGender] = useState<'women' | 'men' | 'kids'>('women');
  const [category, setCategory] = useState('tops');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isDefault, setIsDefault] = useState(false);
  const [fields, setFields] = useState<SizeChartField[]>(DEFAULT_FIELDS['women_tops'] || []);
  const [rows, setRows] = useState<SizeChartRow[]>([
    { label: 'XS', regionalSizes: { us: 'XS', uk: '6', eu: '34' }, measurements: { bust: 82, waist: 62 } },
    { label: 'S', regionalSizes: { us: 'S', uk: '8', eu: '36' }, measurements: { bust: 86, waist: 66 } },
    { label: 'M', regionalSizes: { us: 'M', uk: '10', eu: '38' }, measurements: { bust: 90, waist: 70 } },
    { label: 'L', regionalSizes: { us: 'L', uk: '12', eu: '40' }, measurements: { bust: 96, waist: 76 } },
  ]);

  // Fetch brands list
  const brandsQ = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => (await api.get<ApiResponse<Brand[]>>('/admin/brands')).data,
  });

  // Fetch existing chart if editing
  const chartQ = useQuery({
    queryKey: ['admin-size-chart', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<ApiResponse<SizeChart>>(`/admin/size-charts/${id}`);
      return res.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (chartQ.data?.data) {
      const c = chartQ.data.data;
      setName(c.name || '');
      setBrandId(c.brandId ? String(c.brandId) : '');
      setGender(c.gender || 'women');
      setCategory(c.category || 'tops');
      setStatus(c.status || 'active');
      setIsDefault(Boolean(c.isDefault));
      setFields(c.measurementFields || []);
      setRows(c.sizes || []);
    }
  }, [chartQ.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name || `${gender.toUpperCase()} ${category.toUpperCase()} Size Chart`,
        brandId: brandId ? Number(brandId) : null,
        gender,
        category,
        unit: 'cm',
        measurementFields: fields,
        sizes: rows,
        isDefault,
        status,
      };
      if (isEdit) {
        return api.put(`/admin/size-charts/${id}`, payload);
      }
      return api.post('/admin/size-charts', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Size chart updated' : 'Size chart created');
      qc.invalidateQueries({ queryKey: ['size-charts'] });
      navigate('/size-charts');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Category presets loader
  const handleGenderCategoryChange = (newGender: 'women' | 'men' | 'kids', newCategory: string) => {
    setGender(newGender);
    setCategory(newCategory);
    if (!isEdit) {
      const key = `${newGender}_${newCategory}`;
      const presetFields = DEFAULT_FIELDS[key];
      if (presetFields) {
        setFields(presetFields);
      }
    }
  };

  const addField = () => {
    const newId = `field_${Date.now()}`;
    setFields((prev) => [...prev, { id: newId, label: 'New Field', instruction: 'How to measure' }]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const emptyMeasurements: Record<string, number> = {};
    fields.forEach((f) => {
      emptyMeasurements[f.id] = 80;
    });
    setRows((prev) => [
      ...prev,
      {
        label: 'NEW',
        regionalSizes: { us: 'NEW', uk: '', eu: '' },
        measurements: emptyMeasurements,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Size Chart' : 'Create Size Chart'}
        description="Configure gender, category, body measurement fields, and size conversion rows"
        actions={
          <Button variant="outline" onClick={() => navigate('/size-charts')}>
            <ArrowLeft className="h-4 w-4" /> Back to list
          </Button>
        }
      />

      {/* Main Metadata */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Chart Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Chart Name</Label>
            <Input
              placeholder="e.g. Women's Tops Size Chart"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select
              value={gender}
              onChange={(e) => handleGenderCategoryChange(e.target.value as 'women' | 'men' | 'kids', category)}
            >
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="kids">Kids</option>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={category}
              onChange={(e) => handleGenderCategoryChange(gender, e.target.value)}
            >
              <option value="tops">Tops & Outerwear</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <Label>Brand (Optional)</Label>
            <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">All Brands (Global)</option>
              {brandsQ.data?.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="isDefault" className="cursor-pointer font-medium">Set as default for this category</Label>
          </div>
        </div>
      </Card>

      {/* Measurement Fields */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Measurement Fields</h2>
            <p className="text-xs text-gray-500">Define body area fields user can enter in Size Finder</p>
          </div>
          <Button size="sm" variant="outline" onClick={addField}>
            <Plus className="h-4 w-4" /> Add Field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="md:col-span-3">
                <Label className="text-xs text-gray-500">Field ID</Label>
                <Input
                  value={field.id}
                  onChange={(e) => {
                    const next = [...fields];
                    next[idx]!.id = e.target.value;
                    setFields(next);
                  }}
                />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs text-gray-500">Label (UI Display)</Label>
                <Input
                  value={field.label}
                  onChange={(e) => {
                    const next = [...fields];
                    next[idx]!.label = e.target.value;
                    setFields(next);
                  }}
                />
              </div>
              <div className="md:col-span-5">
                <Label className="text-xs text-gray-500">How to Measure Instruction</Label>
                <Input
                  value={field.instruction}
                  onChange={(e) => {
                    const next = [...fields];
                    next[idx]!.instruction = e.target.value;
                    setFields(next);
                  }}
                />
              </div>
              <div className="md:col-span-1 flex justify-end pt-4">
                <Button variant="ghost" size="sm" onClick={() => removeField(idx)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Size Rows */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Size Chart Rows (Values in CM)</h2>
            <p className="text-xs text-gray-500">Enter measurements in centimeters. Inches conversion is automatic.</p>
          </div>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add Size Row
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
                <th className="p-2.5">Size Label</th>
                <th className="p-2.5">US</th>
                <th className="p-2.5">UK</th>
                <th className="p-2.5">EU</th>
                {fields.map((f) => (
                  <th key={f.id} className="p-2.5">{f.label} (cm)</th>
                ))}
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="p-2">
                    <Input
                      className="h-8 text-xs w-20"
                      value={row.label}
                      onChange={(e) => {
                        const next = [...rows];
                        next[rIdx]!.label = e.target.value;
                        setRows(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className="h-8 text-xs w-16"
                      value={row.regionalSizes.us}
                      onChange={(e) => {
                        const next = [...rows];
                        next[rIdx]!.regionalSizes.us = e.target.value;
                        setRows(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className="h-8 text-xs w-16"
                      value={row.regionalSizes.uk}
                      onChange={(e) => {
                        const next = [...rows];
                        next[rIdx]!.regionalSizes.uk = e.target.value;
                        setRows(next);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className="h-8 text-xs w-16"
                      value={row.regionalSizes.eu}
                      onChange={(e) => {
                        const next = [...rows];
                        next[rIdx]!.regionalSizes.eu = e.target.value;
                        setRows(next);
                      }}
                    />
                  </td>
                  {fields.map((f) => {
                    const rawVal = row.measurements[f.id];
                    const numVal = typeof rawVal === 'number' ? rawVal : (typeof rawVal === 'object' && rawVal ? rawVal.min : 80);
                    return (
                      <td key={f.id} className="p-2">
                        <Input
                          type="number"
                          className="h-8 text-xs w-20"
                          value={numVal}
                          onChange={(e) => {
                            const next = [...rows];
                            next[rIdx]!.measurements[f.id] = Number(e.target.value);
                            setRows(next);
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeRow(rIdx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Action Bar */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => navigate('/size-charts')}>
          Cancel
        </Button>
        <Button onClick={() => saveM.mutate()} loading={saveM.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save Size Chart
        </Button>
      </div>
    </div>
  );
}
