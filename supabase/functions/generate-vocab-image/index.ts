import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { record } = await req.json();

    // Only process if status is 'generating' or it's a new word without an image
    if (!record || !record.word || !record.meaning) {
       return new Response("No word data provided", { status: 400 });
    }

    const wordId = record.id;
    const meaning = record.meaning;

    // Initialize Supabase Client with service role to bypass RLS for updating
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const prompt = `Vibrant 3D claymation illustration of "${meaning}", kid-friendly, white background, cute style, educational, no text, no letters, no characters, single object focus.`;

    // Call Nano Banana 2 (Gemini 3.1 Flash Image) via REST API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        throw new Error(`Gemini API error: ${geminiResponse.status} ${errText}`);
    }

    const response = await geminiResponse.json();

    let base64Image = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (!base64Image) {
      throw new Error("No image data returned from Nano Banana 2");
    }

    // Convert base64 to Blob
    const byteCharacters = atob(base64Image);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'image/png'});

    // Upload to Supabase Storage bucket
    const fileName = `vocab-${wordId}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('vocab-images')
      .upload(fileName, blob, {
        contentType: 'image/png'
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('vocab-images')
      .getPublicUrl(fileName);

    // Update vocabulary table
    const { error: dbError } = await supabase
      .from('vocabulary')
      .update({ 
        image_url: publicUrl,
        image_status: 'done'
      })
      .eq('id', wordId);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("Error generating image:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
