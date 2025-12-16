// functions/toolDatabase.js
// Comprehensive tool database with download links for content creators

const CREATOR_TOOLS = {
    // RECORDING TOOLS
    "OBS Studio": {
        name: "OBS Studio",
        url: "https://obsproject.com/download",
        category: "recording",
        description: "Free open-source recording software"
    },
    "Streamlabs": {
        name: "Streamlabs",
        url: "https://streamlabs.com/streamlabs-live-streaming-software",
        category: "recording",
        description: "Streaming and recording software"
    },
    "Nvidia ShadowPlay": {
        name: "Nvidia ShadowPlay",
        url: "https://www.nvidia.com/en-us/geforce/geforce-experience/shadowplay/",
        category: "recording",
        description: "Game recording with Nvidia GPU"
    },
    "Medal": {
        name: "Medal",
        url: "https://medal.tv/download",
        category: "recording",
        description: "Clip and share gaming moments"
    },

    // EDITING TOOLS
    "DaVinci Resolve": {
        name: "DaVinci Resolve",
        url: "https://www.blackmagicdesign.com/products/davinciresolve",
        category: "editing",
        description: "Professional free video editor"
    },
    "CapCut": {
        name: "CapCut",
        url: "https://www.capcut.com/",
        category: "editing",
        description: "Free all-in-one video editor"
    },
    "Adobe Premiere": {
        name: "Adobe Premiere Pro",
        url: "https://www.adobe.com/products/premiere.html",
        category: "editing",
        description: "Industry-standard video editing"
    },
    "Final Cut Pro": {
        name: "Final Cut Pro",
        url: "https://www.apple.com/final-cut-pro/",
        category: "editing",
        description: "Professional editing for Mac"
    },
    "Kdenlive": {
        name: "Kdenlive",
        url: "https://kdenlive.org/en/download/",
        category: "editing",
        description: "Free open-source video editor"
    },

    // THUMBNAIL TOOLS
    "Canva": {
        name: "Canva",
        url: "https://www.canva.com/",
        category: "thumbnails",
        description: "Easy graphic design platform"
    },
    "Photopea": {
        name: "Photopea",
        url: "https://www.photopea.com/",
        category: "thumbnails",
        description: "Free online Photoshop alternative"
    },
    "Photoshop": {
        name: "Adobe Photoshop",
        url: "https://www.adobe.com/products/photoshop.html",
        category: "thumbnails",
        description: "Professional image editing"
    },
    "Figma": {
        name: "Figma",
        url: "https://www.figma.com/",
        category: "thumbnails",
        description: "Collaborative design tool"
    },
    "GIMP": {
        name: "GIMP",
        url: "https://www.gimp.org/downloads/",
        category: "thumbnails",
        description: "Free open-source image editor"
    },

    // SEO TOOLS
    "TubeBuddy": {
        name: "TubeBuddy",
        url: "https://www.tubebuddy.com/",
        category: "seo",
        description: "YouTube SEO and optimization"
    },
    "VidIQ": {
        name: "VidIQ",
        url: "https://vidiq.com/",
        category: "seo",
        description: "YouTube analytics and SEO"
    },
    "RapidTags": {
        name: "RapidTags",
        url: "https://rapidtags.io/",
        category: "seo",
        description: "YouTube tag generator"
    },

    // ANALYTICS TOOLS
    "YouTube Studio": {
        name: "YouTube Studio",
        url: "https://studio.youtube.com/",
        category: "analytics",
        description: "Official YouTube analytics"
    },
    "Instagram Insights": {
        name: "Instagram Insights",
        url: "https://www.instagram.com/",
        category: "analytics",
        description: "Instagram native analytics"
    },
    "TikTok Analytics": {
        name: "TikTok Analytics",
        url: "https://www.tiktok.com/analytics/",
        category: "analytics",
        description: "TikTok creator analytics"
    },

    // SCHEDULING TOOLS
    "Buffer": {
        name: "Buffer",
        url: "https://buffer.com/",
        category: "scheduling",
        description: "Social media scheduling"
    },
    "Hootsuite": {
        name: "Hootsuite",
        url: "https://www.hootsuite.com/",
        category: "scheduling",
        description: "Social media management"
    },
    "Later": {
        name: "Later",
        url: "https://later.com/",
        category: "scheduling",
        description: "Visual social planner"
    },

    // COMMUNITY TOOLS
    "Discord": {
        name: "Discord",
        url: "https://discord.com/",
        category: "community",
        description: "Build your community server"
    },
    "Telegram": {
        name: "Telegram",
        url: "https://telegram.org/",
        category: "community",
        description: "Messaging and groups"
    },
    "Patreon": {
        name: "Patreon",
        url: "https://www.patreon.com/",
        category: "community",
        description: "Membership platform"
    },

    // MONETIZATION TOOLS
    "Gumroad": {
        name: "Gumroad",
        url: "https://gumroad.com/",
        category: "monetization",
        description: "Sell digital products"
    },
    "Stan Store": {
        name: "Stan Store",
        url: "https://stan.store/",
        category: "monetization",
        description: "Creator commerce platform"
    },
    "Linktree": {
        name: "Linktree",
        url: "https://linktr.ee/",
        category: "monetization",
        description: "Link-in-bio tool"
    },
    "Ko-fi": {
        name: "Ko-fi",
        url: "https://ko-fi.com/",
        category: "monetization",
        description: "Receive donations and sell"
    }
};

// Helper function to get tools by names
function getToolsByNames(toolNames) {
    return toolNames
        .map(name => CREATOR_TOOLS[name])
        .filter(tool => tool !== undefined);
}

// Helper function to get tools by category
function getToolsByCategory(category, limit = 3) {
    return Object.values(CREATOR_TOOLS)
        .filter(tool => tool.category === category)
        .slice(0, limit);
}

module.exports = {
    CREATOR_TOOLS,
    getToolsByNames,
    getToolsByCategory
};
