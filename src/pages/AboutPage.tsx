import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, ShieldCheck, Milestone, HelpingHand, Award } from 'lucide-react';
import EditableText from '../components/EditableText';
import EditableImage from '../components/EditableImage';
// @ts-ignore
import aboutPortrait from '../assets/images/regenerated_image_1780939111959.jpg';

export default function AboutPage() {
  // Default professional welcoming profile portrait
  const defaultPortraitUrl = aboutPortrait;

  return (
    <div className="py-12 space-y-16">
      {/* Intro Breadcrumb */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Meets the Therapist
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-stone-900">
          <EditableText id="about-main-title" defaultValue="The Sanctuary Guided by Empathy" />
        </h1>
        <p className="text-stone-500 text-sm">
          <EditableText id="about-main-subtitle" defaultValue="Learn more about my healing journey, background, and clinical specialties." />
        </p>
      </div>

      {/* Main Split Layout: Big Portrait Image + Story/Bio Pane */}
      <section className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        
        {/* Left Side: Photo Container (Matches the Landing page Hero Image size & presence) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="relative overflow-hidden rounded-3xl bg-stone-900 text-white border border-stone-200/60 shadow-xl h-full min-h-[450px] lg:min-h-[550px]">
            <EditableImage 
              id="about-portrait-photo"
              defaultUrl={defaultPortraitUrl}
              alt="Therapist Profile Photo"
              className="w-full h-full object-cover grayscale brightness-95"
              containerClassName="w-full h-full absolute inset-0"
            />
            {/* Soft decorative visual overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent p-6 flex flex-col justify-end pointer-events-none z-10">
              <span className="text-xs text-stone-300 font-mono tracking-widest uppercase">
                <EditableText id="about-overlay-role" defaultValue="Clinical Director" />
              </span>
              <h3 className="text-xl font-serif font-bold text-white mt-1">
                <EditableText id="about-overlay-name" defaultValue="Kevin Young, LPC, CCH" />
              </h3>
            </div>
          </div>
        </div>

        {/* Right Side: Narrative Details / Bio & Therapeutic Modalities */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 bg-white p-6 md:p-10 rounded-3xl border border-stone-150 shadow-sm">
          
          {/* Bio Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <Heart className="w-5 h-5 text-red-400" />
              <EditableText id="about-bio-headline" defaultValue="My Story & Philosophy" />
            </h2>
            <div className="prose prose-stone max-w-none text-stone-605">
              <EditableText
                id="about-bio-content"
                defaultValue={"Welcome to Embracing Not Easy. Over the last decade, I have dedicated myself to helping clients navigate their deepest emotional landscape and find light in places of anxiety, trauma, and confusion.\n\nMy core approach centers on the understanding that life is beautiful yet profoundly messy. Wellness isn't about eradicating difficulty—it's about learning how to expand your capacity to encounter adversity with deep self-compassion, presence, and calm. Working with guided imagery and deep behavioral modalities, we rebuild connection of body and mind."}
                tag="p"
                multiline={true}
                className="text-stone-605 leading-relaxed font-sans whitespace-pre-wrap text-sm md:text-base block"
              />
            </div>
          </div>

          {/* Types of Therapy Offered Section */}
          <div className="space-y-4 pt-2">
            <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-3">
              <HelpingHand className="w-5 h-5 text-indigo-500" />
              <EditableText id="about-therapy-headline" defaultValue="The Therapeutic Modalities I Offer" />
            </h2>
            <div className="prose prose-stone max-w-none text-stone-605">
              <EditableText
                id="about-therapy-content"
                defaultValue={"My practice integrates evidence-based paradigms with holistic, state-of-mind interventions. Each session is individually tailored and paced:\n\n• Hypnotherapy & Subconscious Healing: Safely unlocking negative thought scripts and replacing them with affirming focus paradigms.\n• Guided Imagery & Meditation: Creative exercises to lower heart-rate, alleviate physical tension, and visualize personal empowerment.\n• Cognitive-Behavioral Mindfulness: Merging classical restructuring keys with somatics and neural integration."}
                tag="p"
                multiline={true}
                className="text-stone-605 leading-relaxed font-sans whitespace-pre-wrap text-sm md:text-base block"
              />
            </div>
          </div>

          {/* Core Values / Badges */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-stone-100">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-stone-800 font-mono">10+ Years</h4>
                <p className="text-[10px] text-stone-500">Clinical Experience</p>
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-stone-800 font-mono">Licensed</h4>
                <p className="text-[10px] text-stone-500">Board Certified LHMC</p>
              </div>
            </div>
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 col-span-2 md:col-span-1 flex items-center gap-2.5">
              <Milestone className="w-5 h-5 text-stone-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-stone-800 font-mono">Evidence-Based</h4>
                <p className="text-[10px] text-stone-500">Scientific Integration</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust Quote Accent */}
      <section className="bg-stone-900 text-stone-100 rounded-3xl p-8 text-center max-w-4xl mx-auto space-y-4">
        <p className="text-lg md:text-xl font-serif italic text-stone-300">
          "<EditableText id="about-quote-text" defaultValue="Behind every moment of resilience is a willingness to let things be difficult. You don't have to carry the load entirely alone." />"
        </p>
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400">
          — <EditableText id="about-quote-author" defaultValue="Kevin" />
        </p>
      </section>
    </div>
  );
}
