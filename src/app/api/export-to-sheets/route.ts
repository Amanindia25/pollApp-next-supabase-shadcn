import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const supabase = await createClient();

  // 1. Authenticate with Google Sheets API using credentials.json file
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({
    version: 'v4',
    auth,
  });

  // Get spreadsheet ID from environment variable or credentials file
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || credentials.sheet_id;
  
  if (!spreadsheetId) {
    console.error('No spreadsheet ID provided. Please add it to your credentials.json file as "sheet_id" or set GOOGLE_SHEET_ID environment variable.');
    return NextResponse.json({ error: 'Spreadsheet ID not configured. Please check server logs.' }, { status: 500 });
  }
  
  // Validate that the spreadsheet ID is not the example one
  if (spreadsheetId === '1BcD2EfG3HiJ4KlM5NoPqR6StUvWxYz7AbCdEfGhIjKl') {
    console.error('You are using the example spreadsheet ID. Please replace it with your actual Google Sheet ID.');
    return NextResponse.json({ error: 'Please update the spreadsheet ID in credentials.json with your actual Google Sheet ID.' }, { status: 500 });
  }
  const range = 'Sheet1!A:Z'; // Adjust this to your sheet name and desired range

  try {
    // 2. Fetch poll data from Supabase
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('id, title, options, created_at, created_by');

    if (pollsError) {
      console.error('Error fetching polls:', pollsError);
      return NextResponse.json({ error: 'Failed to fetch polls from database' }, { status: 500 });
    }
    
    if (!polls || polls.length === 0) {
      return NextResponse.json({ message: 'No polls found to export' }, { status: 200 });
    }

    const { data: responses, error: responsesError } = await supabase
      .from('poll_responses')
      .select('poll_id, user_id, selected_option');

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: 'Failed to fetch poll responses.' }, { status: 500 });
    }

    // Prepare data for Google Sheets
    const header = [
      'Poll ID', 'Poll Title', 'Option Text', 'Votes', 'Percentage', 
      'Response User ID', 'Response Selected Option', 'Response Created At'
    ];
    const rows = [header];

    polls.forEach((poll: any) => {
      const totalVotes = poll.options.reduce((sum: number, option: any) => sum + option.votes, 0);
      poll.options.forEach((option: any) => {
        const percentage = totalVotes === 0 ? 0 : (option.votes / totalVotes) * 100;
        const pollResponses = responses.filter((res: any) => res.poll_id === poll.id && res.selected_option === option.text);

        if (pollResponses.length > 0) {
          pollResponses.forEach((response: any) => {
            rows.push([
              poll.id,
              poll.title,
              option.text,
              option.votes,
              percentage.toFixed(2),
              response.user_id,
              response.selected_option,
              '', // No created_at available
            ]);
          });
        } else {
          // Include options even if no one voted for them yet
          rows.push([
            poll.id,
            poll.title,
            option.text,
            option.votes,
            percentage.toFixed(2),
            '', // No user ID
            '', // No selected option
            '', // No created at
          ]);
        }
      });
    });

    // 3. Write data to Google Sheet
    try {
      // First check if we can access the spreadsheet
      await sheets.spreadsheets.get({
        spreadsheetId
      });
      
      // Clear existing data
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Sheet1!A:Z',
      });

      // Append new data
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    } catch (sheetError: any) {
      console.error('Google Sheets API error:', sheetError);
      if (sheetError.code === 404) {
        return NextResponse.json({ error: 'Spreadsheet not found. Please check your spreadsheet ID.' }, { status: 404 });
      } else if (sheetError.code === 403) {
        return NextResponse.json({ error: 'Permission denied. Make sure you have shared the spreadsheet with your service account email.' }, { status: 403 });
      }
      throw sheetError; // Re-throw to be caught by the outer catch block
    }

    return NextResponse.json({ message: 'Data exported to Google Sheet successfully!' });
  } catch (error: any) {
    console.error('Error exporting data to Google Sheet:', error);
    
    // Provide more specific error messages based on the error type
    if (error.message?.includes('auth')) {
      return NextResponse.json({ 
        error: 'Authentication error with Google Sheets API. Please check your credentials.json file.' 
      }, { status: 401 });
    } else if (error.message?.includes('permission') || error.message?.includes('access')) {
      return NextResponse.json({ 
        error: 'Permission denied. Make sure you have shared the spreadsheet with your service account email: ' + credentials.client_email 
      }, { status: 403 });
    } else if (error.message?.includes('not found') || error.message?.includes('404')) {
      return NextResponse.json({ 
        error: 'Spreadsheet not found. Please check your spreadsheet ID in credentials.json.' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to export data to Google Sheet: ' + (error.message || 'Unknown error') 
    }, { status: 500 });
  }
}