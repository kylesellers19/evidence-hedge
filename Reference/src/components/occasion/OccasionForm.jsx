import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { IconChevronRight } from '../Icons'

const OCCASION_TYPES = [
  'Wedding',
  'Work / Business',
  'Cocktail Party',
  'Black Tie Gala',
  'Date Night',
  'Brunch',
  'Beach / Vacation',
  'Concert / Festival',
  'Garden Party',
  'Casual Gathering',
]

const DRESS_CODES = [
  'White Tie',
  'Black Tie',
  'Black Tie Optional',
  'Formal',
  'Cocktail Attire',
  'Semi-Formal',
  'Business Professional',
  'Business Casual',
  'Smart Casual',
  'Casual',
  'Beach / Resort',
]

const TIMES_OF_DAY = ['Morning', 'Afternoon', 'Evening', 'Night']
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter']

function SelectField({ label, name, value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <label className="label-tag block mb-2">{label}</label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="field-select pr-8"
          required
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
          <svg className="w-4 h-4 text-muted" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

function TextField({ label, name, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label-tag block mb-2">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="field-input"
      />
    </div>
  )
}

const EMPTY_FORM = {
  type: '',
  dressCode: '',
  venue: '',
  timeOfDay: '',
  season: '',
  city: '',
}

export default function OccasionForm() {
  const navigate = useNavigate()
  const { dispatch } = useApp()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    const required = ['type', 'dressCode', 'timeOfDay', 'season']
    const newErrors = {}
    required.forEach(key => {
      if (!form[key]) newErrors[key] = 'Required'
    })
    return newErrors
  }

  const handleSubmit = e => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    dispatch({ type: 'SET_OCCASION', payload: form })
    navigate('/inspire')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Required fields */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <SelectField
            label="Occasion Type *"
            name="type"
            value={form.type}
            onChange={handleChange}
            options={OCCASION_TYPES}
            placeholder="Select occasion"
          />
          {errors.type && <p className="text-xs text-red-500 -mt-4">{errors.type}</p>}

          <SelectField
            label="Dress Code *"
            name="dressCode"
            value={form.dressCode}
            onChange={handleChange}
            options={DRESS_CODES}
            placeholder="Select dress code"
          />
          {errors.dressCode && <p className="text-xs text-red-500 -mt-4">{errors.dressCode}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Time of Day *"
            name="timeOfDay"
            value={form.timeOfDay}
            onChange={handleChange}
            options={TIMES_OF_DAY}
            placeholder="When"
          />
          <SelectField
            label="Season *"
            name="season"
            value={form.season}
            onChange={handleChange}
            options={SEASONS}
            placeholder="Season"
          />
        </div>
      </div>

      {/* Optional fields */}
      <div className="pt-2 border-t border-border space-y-6">
        <p className="label-tag text-gray-400">Optional — helps refine results</p>
        <div className="space-y-6">
          <TextField
            label="Venue Name"
            name="venue"
            value={form.venue}
            onChange={handleChange}
            placeholder="e.g. The Pierre Hotel"
          />
          <TextField
            label="City / Location"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="e.g. New York, NY"
          />
        </div>
      </div>

      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-3 mt-2">
        Get Inspired
        <IconChevronRight className="w-4 h-4" />
      </button>
    </form>
  )
}
