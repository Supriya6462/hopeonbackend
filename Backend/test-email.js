/**
 * Email Service Test Script
 * Run this to test your email configuration
 * 
 * Usage: node test-email.js
 */

import dotenv from 'dotenv';
import { testEmailConnection } from './services/emailService.js';

// Load environment variables
dotenv.config();

console.log('\n🧪 Testing Email Service Configuration...\n');

// Check if environment variables are set
console.log('📋 Environment Variables:');
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not Set'}`);
console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not Set'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not Set'}\n`);

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ Error: EMAIL_USER and EMAIL_PASS must be set in .env file\n');
  process.exit(1);
}

// Test email connection
console.log('🔌 Testing email service connection...\n');

testEmailConnection()
  .then((success) => {
    if (success) {
      console.log('\n✅ SUCCESS! Email service is configured correctly.');
      console.log('📧 You can now send emails from your application.\n');
      console.log('💡 Next steps:');
      console.log('   1. Start your server: npm run dev');
      console.log('   2. Test the organizer application flow');
      console.log('   3. Check your email inbox for notifications\n');
    } else {
      console.log('\n❌ FAILED! Email service configuration has issues.');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Verify EMAIL_USER is a valid Gmail address');
      console.log('   2. Verify EMAIL_PASS is a valid Gmail App Password');
      console.log('   3. Check your internet connection');
      console.log('   4. Review the error message above\n');
    }
  })
  .catch((error) => {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your .env file configuration');
    console.log('   2. Verify Gmail App Password is correct');
    console.log('   3. Ensure "Less secure app access" is enabled (if not using app password)');
    console.log('   4. Check firewall/network settings\n');
  });
