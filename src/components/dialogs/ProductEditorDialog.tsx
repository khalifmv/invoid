/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { DropdownSelect, type DropdownOption } from '../ui/DropdownSelect'
import { Input } from '../ui/Input'
import { NumberInput } from '../ui/NumberInput'
import {
    DEFAULT_PRICING_MODE,
    DEFAULT_UNIT_CODE,
    normalizePricingMode,
    normalizeUnitCode,
    PRICING_MODE_OPTIONS,
    UNIT_OPTIONS,
} from '../../lib/item-semantics'
import type { PricingMode, UnitCode } from '../../types'

export interface ProductFormData {
    name: string
    categoryId?: string
    price: number
    unitCode: UnitCode
    customUnitLabel: string
    pricingMode: PricingMode
}

interface ProductEditorDialogProps {
    open: boolean
    onClose: () => void
    onSave: (data: ProductFormData) => void
    title?: string
    saveLabel?: string
    categoryOptions?: DropdownOption[]
    showCategory?: boolean
}

export function ProductEditorDialog({
    open,
    onClose,
    onSave,
    title = 'Add New Product',
    saveLabel = 'Save Product',
    categoryOptions = [],
    showCategory = true,
}: ProductEditorDialogProps) {
    const [name, setName] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [price, setPrice] = useState(0)
    const [unitCode, setUnitCode] = useState<UnitCode>(DEFAULT_UNIT_CODE)
    const [customUnitLabel, setCustomUnitLabel] = useState('')
    const [pricingMode, setPricingMode] = useState<PricingMode>(DEFAULT_PRICING_MODE)

    useEffect(() => {
        if (open) {
            setName('')
            setCategoryId('')
            setPrice(0)
            setUnitCode(DEFAULT_UNIT_CODE)
            setCustomUnitLabel('')
            setPricingMode(DEFAULT_PRICING_MODE)
        }
    }, [open])

    const handleSave = () => {
        onSave({
            name,
            categoryId: showCategory ? categoryId : undefined,
            price,
            unitCode,
            customUnitLabel,
            pricingMode,
        })
    }

    const unitOptions = useMemo<DropdownOption[]>(() => UNIT_OPTIONS, [])
    const pricingModeOptions = useMemo<DropdownOption[]>(() => PRICING_MODE_OPTIONS, [])

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={name.trim().length === 0}>
                        {saveLabel}
                    </Button>
                </>
            }
        >
            <div className="grid gap-3 pt-2">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Product Image</label>
                    <div className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:border-zinc-400 hover:bg-zinc-100">
                        <span className="text-sm font-semibold text-zinc-600">Click to upload image</span>
                        <span className="mt-1 text-xs text-zinc-400">(Feature coming soon)</span>
                    </div>
                </div>

                <div>
                    <label htmlFor="prod-name-editor" className="mb-1 block text-xs font-semibold text-zinc-600">
                        Product Name
                    </label>
                    <Input
                        id="prod-name-editor"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="e.g. Coffee Beans"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-600">Price</label>
                        <NumberInput min={0} value={price} onValueChange={setPrice} />
                    </div>
                    {showCategory && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-zinc-600">Category</label>
                            <DropdownSelect value={categoryId} onChange={setCategoryId} options={categoryOptions} />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-600">Unit</label>
                        <DropdownSelect
                            value={unitCode}
                            onChange={(nextValue) => {
                                const nextUnitCode = normalizeUnitCode(nextValue)
                                setUnitCode(nextUnitCode)
                                if (nextUnitCode !== 'custom') {
                                    setCustomUnitLabel('')
                                }
                            }}
                            options={unitOptions}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-600">Pricing Mode</label>
                        <DropdownSelect
                            value={pricingMode}
                            onChange={(nextValue) => setPricingMode(normalizePricingMode(nextValue))}
                            options={pricingModeOptions}
                        />
                    </div>
                </div>

                {unitCode === 'custom' && (
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-600">Custom Unit Label</label>
                        <Input
                            value={customUnitLabel}
                            onChange={(event) => setCustomUnitLabel(event.target.value)}
                            placeholder="e.g. pack, tray"
                        />
                    </div>
                )}
            </div>
        </Dialog>
    )
}
