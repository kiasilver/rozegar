// Mapping platform names to Material UI icons
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PinterestIcon from '@mui/icons-material/Pinterest';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import ShareIcon from '@mui/icons-material/Share';
import TagIcon from '@mui/icons-material/Tag'; // For hashtag/custom platforms

export const socialIconMap: Record<string, React.ComponentType<any>> = {
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  pinterest: PinterestIcon,
  rss: RssFeedIcon,
  default: ShareIcon,
  hashtag: TagIcon,
};

export function getSocialIcon(platform: string): React.ComponentType<any> {
  const normalized = platform.toLowerCase().replace(/[#\s]/g, '');
  
  // Check if it's a hashtag/custom platform
  if (platform.startsWith('#')) {
    return socialIconMap.hashtag || socialIconMap.default;
  }
  
  return socialIconMap[normalized] || socialIconMap.default;
}

export function getSocialIconName(platform: string): string {
  if (platform.startsWith('#')) {
    return 'TagIcon';
  }
  
  const normalized = platform.toLowerCase().replace(/[#\s]/g, '');
  const iconMap: Record<string, string> = {
    facebook: 'Facebook',
    twitter: 'Twitter',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    pinterest: 'Pinterest',
    rss: 'RssFeed',
  };
  
  return iconMap[normalized] || 'Share';
}

