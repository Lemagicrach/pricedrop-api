# PriceDrop API Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Code should be in a GitHub repository
3. **Supabase Account**: For database (optional for demo)
4. **SendGrid Account**: For email notifications (optional)

## Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

### Required for Production
```bash
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional (for full functionality)
```bash
SENDGRID_API_KEY=your_sendgrid_key
JWT_SECRET=your_jwt_secret
RAPIDAPI_PROXY_SECRET=your_rapidapi_secret
```

## Deployment Steps

### 1. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration
1. Connect your GitHub repository to Vercel
2. Import the project
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### 2. Configure Environment Variables in Vercel

1. Go to your project dashboard on Vercel
2. Navigate to Settings → Environment Variables
3. Add all required environment variables
4. Redeploy the project

### 3. Set up Database (Optional)

#### Supabase Setup
1. Create a new project on [supabase.com](https://supabase.com)
2. Run the SQL schema (see `database/schema.sql`)
3. Get your project URL and anon key
4. Add to environment variables

### 4. Configure RapidAPI (Optional)

1. List your API on [RapidAPI](https://rapidapi.com)
2. Set the base URL to your Vercel deployment
3. Configure pricing plans
4. Test endpoints

## API Endpoints

### Base URL
```
https://your-deployment.vercel.app/api
```

### Available Endpoints
- `GET /health` - Health check
- `GET /stores` - Supported stores
- `POST /price-check` - Check product price
- `POST /v1/track` - Track product
- `GET /v1/products` - List tracked products

## Testing

### Local Testing
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test endpoints
curl http://localhost:3000/api/health
```

### Production Testing
```bash
# Test health endpoint
curl https://your-deployment.vercel.app/api/health

# Test price check (requires API key)
curl -X POST https://your-deployment.vercel.app/api/price-check \
  -H "Content-Type: application/json" \
  -H "X-RapidAPI-Key: your-api-key" \
  -d '{"url": "https://www.amazon.com/dp/B08N5WRWNW"}'
```

## Monitoring

### Vercel Analytics
- Enable Vercel Analytics in your project settings
- Monitor function performance and errors

### Error Tracking
- Configure Sentry for error tracking (optional)
- Add SENTRY_DSN to environment variables

## Scaling Considerations

### Rate Limiting
- Implement Redis-based rate limiting for production
- Configure rate limits per plan in authentication middleware

### Database
- Use Supabase for production database
- Implement proper connection pooling
- Add database indexes for performance

### Caching
- Implement caching for frequently accessed data
- Use Vercel Edge Cache for static responses

## Security

### API Security
- Always validate input data
- Use HTTPS only
- Implement proper CORS headers
- Rate limit API endpoints

### Environment Variables
- Never commit secrets to version control
- Use Vercel's environment variable encryption
- Rotate API keys regularly

## Troubleshooting

### Common Issues

1. **Function Timeout**
   - Increase maxDuration in vercel.json
   - Optimize scraping logic

2. **CORS Errors**
   - Check CORS headers in vercel.json
   - Ensure OPTIONS method is handled

3. **Environment Variables**
   - Verify variables are set in Vercel dashboard
   - Check variable names match exactly

4. **Database Connection**
   - Verify Supabase credentials
   - Check network connectivity

### Logs
- View function logs in Vercel dashboard
- Use console.log for debugging
- Implement structured logging for production

## Support

For issues and questions:
- Check the GitHub repository issues
- Review Vercel documentation
- Contact support through the appropriate channels

