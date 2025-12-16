// src/constants/toolDatabase.js
// Comprehensive tool database with download links for content creators

export const CREATOR_TOOLS = {
    // RECORDING TOOLS
    "OBS Studio": {
        name: "OBS Studio",
        url: "https://obsproject.com/download",
        category: "recording"
    },
    "Streamlabs": {
        name: "Streamlabs",
        url: "https://streamlabs.com/streamlabs-live-streaming-software",
        category: "recording"
    },
    "Nvidia ShadowPlay": {
        name: "Nvidia ShadowPlay",
        url: "https://www.nvidia.com/en-us/geforce/geforce-experience/shadowplay/",
        category: "recording"
    },
    "Medal": {
        name: "Medal",
        url: "https://medal.tv/download",
        category: "recording"
    },

    // EDITING TOOLS
    "DaVinci Resolve": {
        name: "DaVinci Resolve",
        url: "https://www.blackmagicdesign.com/products/davinciresolve",
        category: "editing"
    },
    "CapCut": {
        name: "CapCut",
        url: "https://www.capcut.com/",
        category: "editing"
    },
    "Adobe Premiere": {
        name: "Adobe Premiere Pro",
        url: "https://www.adobe.com/products/premiere.html",
        category: "editing"
    },
    "Final Cut Pro": {
        name: "Final Cut Pro",
        url: "https://www.apple.com/final-cut-pro/",
        category: "editing"
    },
    "Kdenlive": {
        name: "Kdenlive",
        url: "https://kdenlive.org/en/download/",
        category: "editing"
    },

    // THUMBNAIL TOOLS
    "Canva": {
        name: "Canva",
        url: "https://www.canva.com/",
        category: "thumbnails"
    },
    "Photopea": {
        name: "Photopea",
        url: "https://www.photopea.com/",
        category: "thumbnails"
    },
    "Photoshop": {
        name: "Adobe Photoshop",
        url: "https://www.adobe.com/products/photoshop.html",
        category: "thumbnails"
    },
    "Figma": {
        name: "Figma",
        url: "https://www.figma.com/",
        category: "thumbnails"
    },
    "GIMP": {
        name: "GIMP",
        url: "https://www.gimp.org/downloads/",
        category: "thumbnails"
    },

    // SEO TOOLS
    "TubeBuddy": {
        name: "TubeBuddy",
        url: "https://www.tubebuddy.com/",
        category: "seo"
    },
    "VidIQ": {
        name: "VidIQ",
        url: "https://vidiq.com/",
        category: "seo"
    },
    "RapidTags": {
        name: "RapidTags",
        url: "https://rapidtags.io/",
        category: "seo"
    },

    // ANALYTICS TOOLS
    "YouTube Studio": {
        name: "YouTube Studio",
        url: "https://studio.youtube.com/",
        category: "analytics"
    },
    "Instagram Insights": {
        name: "Instagram Insights",
        url: "https://www.instagram.com/",
        category: "analytics"
    },
    "TikTok Analytics": {
        name: "TikTok Analytics",
        url: "https://www.tiktok.com/analytics/",
        category: "analytics"
    },

    // SCHEDULING TOOLS
    "Buffer": {
        name: "Buffer",
        url: "https://buffer.com/",
        category: "scheduling"
    },
    "Hootsuite": {
        name: "Hootsuite",
        url: "https://www.hootsuite.com/",
        category: "scheduling"
    },
    "Later": {
        name: "Later",
        url: "https://later.com/",
        category: "scheduling"
    },

    // COMMUNITY TOOLS
    "Discord": {
        name: "Discord",
        url: "https://discord.com/",
        category: "community"
    },
    "Telegram": {
        name: "Telegram",
        url: "https://telegram.org/",
        category: "community"
    },
    "Patreon": {
        name: "Patreon",
        url: "https://www.patreon.com/",
        category: "community"
    },

    // MONETIZATION TO OLS
    "Gumroad": {
        name: "Gumroad",
        url: "https://gumroad.com/",
        category: "monetization"
    },
    "Stan Store": {
        name: "Stan Store",
        url: "https://stan.store/",
        category: "monetization"
    },
    "Linktree": {
        name: "Linktree",
        url: "https://linktr.ee/",
        category: "monetization"
    },
    "Ko-fi": {
        name: "Ko-fi",
        url: "https://ko-fi.com/",
        category: "monetization"
    },
    "Google Account": {
        name: "Google Account",
        url: "https://accounts.google.com/",
        category: "account"
    }
};

// Helper function to convert tool names to resources with URLs
export function convertToolsToResources(toolNames) {
    if (!toolNames || !Array.isArray(toolNames)) return [];

    return toolNames
        .map(name => {
            const tool = CREATOR_TOOLS[name];
            if (tool) {
                return { name: tool.name, url: tool.url };
            }
            // If tool not in database, return with search URL
            return {
                name: name,
                url: `https://www.google.com/search?q=${encodeURIComponent(name + ' download')}`
            };
        });
}
