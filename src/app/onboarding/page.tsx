"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TEMPLATES, cloneTemplateBlocks, Template } from "@/lib/templates"
import { siteContentSchema } from "@/lib/validation/site-content"
import { Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"

type Step = "template" | "profile" | "links" | "complete"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("template")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [profile, setProfile] = useState({
    name: "",
    headline: "",
    bio: "",
  })
  const [links, setLinks] = useState([
    { label: "Twitter", url: "", icon: "twitter" },
    { label: "LinkedIn", url: "", icon: "linkedin" },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
  }

  const handleNext = () => {
    setError(null)
    if (step === "template" && selectedTemplate) {
      setStep("profile")
    } else if (step === "profile") {
      if (!profile.name.trim()) {
        setError("Enter your name before continuing.")
        return
      }
      setStep("links")
    } else if (step === "links") {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (step === "profile") {
      setStep("template")
    } else if (step === "links") {
      setStep("profile")
    }
  }

  const handleComplete = async () => {
    if (!selectedTemplate || saving) return

    setSaving(true)
    setError(null)

    try {
      // Clone template blocks and update with user data
      const blocks = cloneTemplateBlocks(selectedTemplate.blocks)

      // Update hero block with profile data
      const heroBlock = blocks.find((b) => b.type === "hero")
      if (heroBlock && heroBlock.type === "hero") {
        heroBlock.data.name = profile.name.trim() || "Your Name"
        heroBlock.data.headline = profile.headline || "Your Headline"
        heroBlock.data.bio = profile.bio || "Tell your story here..."
      }

      // Update links block
      const linksBlock = blocks.find((b) => b.type === "links")
      if (linksBlock && linksBlock.type === "links") {
        linksBlock.data.links = links
          .filter((l) => l.url)
          .map((l, i) => ({
            id: `link-${i}`,
            ...l,
          }))
      }

      const result = siteContentSchema.safeParse({ blocks, theme: selectedTemplate.theme })
      if (!result.success) {
        setError(result.error.issues[0]?.message || "Check your site details.")
        return
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || "Could not create your site. Please try again.")
      }
      setStep("complete")
      router.push("/editor")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create your site. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleLinkChange = (index: number, field: string, value: string) => {
    setLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    )
  }

  const addLink = () => {
    setLinks((prev) => [...prev, { label: "Website", url: "", icon: "website" }])
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {["template", "profile", "links"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : ["profile", "links", "complete"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {["profile", "links", "complete"].indexOf(step) > i ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      ["profile", "links", "complete"].indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
          {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
          {step === "template" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Choose your template
              </h1>
              <p className="text-gray-600 mb-8">
                Pick a starting point. You can customize everything later.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate?.id === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className="w-full h-24 rounded-lg mb-3"
                      style={{ backgroundColor: template.theme.primaryColor + "20" }}
                    />
                    <div className="font-semibold text-gray-900">
                      {template.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  disabled={!selectedTemplate}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === "profile" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Tell us about yourself
              </h1>
              <p className="text-gray-600 mb-8">
                This will appear at the top of your site.
              </p>

              <div className="space-y-4 mb-8">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    id="profile-name"
                    maxLength={200}
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label htmlFor="profile-headline" className="block text-sm font-medium text-gray-700 mb-1">
                    Headline
                  </label>
                  <input
                    id="profile-headline"
                    maxLength={300}
                    type="text"
                    value={profile.headline}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, headline: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Designer, Developer, Creator"
                  />
                </div>

                <div>
                  <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Short Bio
                  </label>
                  <textarea
                    id="profile-bio"
                    maxLength={5000}
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, bio: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="A brief introduction about yourself..."
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === "links" && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Add your links
              </h1>
              <p className="text-gray-600 mb-8">
                Where can people find you online?
              </p>

              <div className="space-y-3 mb-6">
                {links.map((link, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3">
                    <select
                      aria-label={`Link ${index + 1} icon`}
                      value={link.icon}
                      onChange={(e) =>
                        handleLinkChange(index, "icon", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="twitter">Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="website">Website</option>
                      <option value="email">Email</option>
                    </select>
                    <input
                      type="text"
                      aria-label={`Link ${index + 1} label`}
                      maxLength={200}
                      value={link.label}
                      onChange={(e) =>
                        handleLinkChange(index, "label", e.target.value)
                      }
                      className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Label"
                    />
                    <input
                      type="url"
                      aria-label={`Link ${index + 1} URL`}
                      maxLength={2048}
                      value={link.url}
                      onChange={(e) =>
                        handleLinkChange(index, "url", e.target.value)
                      }
                      className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={addLink}
                disabled={links.length >= 50 || saving}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-8"
              >
                + Add another link
              </button>

              <div className="flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      Create My Site <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === "complete" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Your site is published!
              </h1>
              <p className="text-gray-600">
                Redirecting you to the editor...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
