/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Workspace, User, Feedback, Theme, Report, Session } from './types.js';
import { Firestore } from '@google-cloud/firestore';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Initialize Firestore
let firestore: Firestore | null = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firestore = new Firestore({
      projectId: config.projectId,
      databaseId: config.firestoreDatabaseId || undefined,
    });
    console.log(`Firestore initialized with project: ${config.projectId}, database: ${config.firestoreDatabaseId}`);
  } else {
    console.warn('firebase-applet-config.json not found, falling back to local-only mode');
  }
} catch (error) {
  console.error('Failed to initialize Firestore, falling back to local-only mode:', error);
}

// Simple SHA-256 password hash helper
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Low-cost simulated embedding helper (384 dimensions or similar) to support offline/test usage,
// combined with real Gemini embeddings when API is used.
export function generateSimulatedEmbedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text.toLowerCase()).digest();
  const vector: number[] = [];
  for (let i = 0; i < 64; i++) {
    // Generate 64 dimensions from hash
    const byteVal = hash[i % hash.length];
    vector.push((byteVal / 127.5) - 1.0);
  }
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(v => v / (magnitude || 1));
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mA += v1[i] * v1[i];
    mB += v2[i] * v2[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB) || 1);
}

interface DatabaseSchema {
  workspaces: Workspace[];
  users: User[];
  feedbacks: Feedback[];
  themes: Theme[];
  reports: Report[];
  sessions: Session[];
}

class LocalDB {
  private schema: DatabaseSchema = {
    workspaces: [],
    users: [],
    feedbacks: [],
    themes: [],
    reports: [],
    sessions: [],
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        this.schema = JSON.parse(data);
      } else {
        this.initializeWithSeedData();
        this.save();
      }
    } catch (err) {
      console.error('Failed to load database, starting fresh:', err);
      this.initializeWithSeedData();
      this.save();
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.schema, null, 2), 'utf8');
    } catch (err) {
      console.warn('Failed to save database to local storage:', err);
    }
  }

  public async init() {
    if (!firestore) {
      console.log('Using local JSON-file database (offline/no firestore config)');
      this.load();
      return;
    }

    try {
      console.log('Loading database state from Firestore...');
      
      // Load workspaces
      const workspaceSnap = await firestore.collection('workspaces').get();
      if (workspaceSnap.empty) {
        console.log('Firestore is empty. Seeding database...');
        this.initializeWithSeedData();
        await this.saveAllToFirestore();
        this.save(); // Also save local json
        return;
      }

      // Load workspaces
      const workspaces: Workspace[] = [];
      workspaceSnap.forEach(doc => {
        workspaces.push(doc.data() as Workspace);
      });

      // Load users
      const users: User[] = [];
      const userSnap = await firestore.collection('users').get();
      userSnap.forEach(doc => {
        users.push(doc.data() as User);
      });

      // Load feedbacks
      const feedbacks: Feedback[] = [];
      const feedbackSnap = await firestore.collection('feedbacks').get();
      feedbackSnap.forEach(doc => {
        feedbacks.push(doc.data() as Feedback);
      });

      // Load themes
      const themes: Theme[] = [];
      const themeSnap = await firestore.collection('themes').get();
      themeSnap.forEach(doc => {
        themes.push(doc.data() as Theme);
      });

      // Load reports
      const reports: Report[] = [];
      const reportSnap = await firestore.collection('reports').get();
      reportSnap.forEach(doc => {
        reports.push(doc.data() as Report);
      });

      // Load sessions
      const sessions: Session[] = [];
      const sessionSnap = await firestore.collection('sessions').get();
      sessionSnap.forEach(doc => {
        sessions.push(doc.data() as Session);
      });

      this.schema = {
        workspaces,
        users,
        feedbacks,
        themes,
        reports,
        sessions,
      };

      console.log(`Successfully loaded from Firestore: ${workspaces.length} workspaces, ${users.length} users, ${feedbacks.length} feedbacks, ${themes.length} themes, ${reports.length} reports, ${sessions.length} sessions.`);
      
      // Also write back to local json file just in case
      this.save();
    } catch (error: any) {
      console.warn('Firestore not accessible or missing permissions. Disabling Firestore sync and falling back to local JSON database.');
      firestore = null;
      this.load();
    }
  }

  private async saveDocToFirestore(collection: string, docId: string, data: any) {
    if (!firestore) return;
    try {
      await firestore.collection(collection).doc(docId).set(data);
    } catch (error: any) {
      console.warn(`Failed to save doc to Firestore [${collection}/${docId}]:`, error instanceof Error ? error.message : error);
    }
  }

  private async deleteDocFromFirestore(collection: string, docId: string) {
    if (!firestore) return;
    try {
      await firestore.collection(collection).doc(docId).delete();
    } catch (error: any) {
      console.warn(`Failed to delete doc from Firestore [${collection}/${docId}]:`, error instanceof Error ? error.message : error);
    }
  }

  private async saveAllToFirestore() {
    if (!firestore) return;
    try {
      console.log('Saving all seeded data to Firestore...');
      // Use batches for seeding
      let batch = firestore.batch();
      let operationCount = 0;

      // 1. Workspaces
      for (const w of this.schema.workspaces) {
        const ref = firestore.collection('workspaces').doc(w.id);
        batch.set(ref, w);
        operationCount++;
        if (operationCount >= 400) {
          await batch.commit();
          batch = firestore.batch();
          operationCount = 0;
        }
      }

      // 2. Users
      for (const u of this.schema.users) {
        const ref = firestore.collection('users').doc(u.id);
        batch.set(ref, u);
        operationCount++;
        if (operationCount >= 400) {
          await batch.commit();
          batch = firestore.batch();
          operationCount = 0;
        }
      }

      // 3. Themes
      for (const t of this.schema.themes) {
        const ref = firestore.collection('themes').doc(t.id);
        batch.set(ref, t);
        operationCount++;
        if (operationCount >= 400) {
          await batch.commit();
          batch = firestore.batch();
          operationCount = 0;
        }
      }

      // 4. Feedbacks
      for (const f of this.schema.feedbacks) {
        const ref = firestore.collection('feedbacks').doc(f.id);
        batch.set(ref, f);
        operationCount++;
        if (operationCount >= 400) {
          await batch.commit();
          batch = firestore.batch();
          operationCount = 0;
        }
      }

      // Commit any remaining
      if (operationCount > 0) {
        await batch.commit();
      }
      console.log('Finished saving seeded data to Firestore!');
    } catch (error: any) {
      console.warn('Error saving seeded data to Firestore:', error instanceof Error ? error.message : error);
    }
  }

  private async clearAllFromFirestore() {
    if (!firestore) return;
    try {
      console.log('Purging Firestore database...');
      const collections = ['workspaces', 'users', 'themes', 'feedbacks', 'reports', 'sessions'];
      for (const collName of collections) {
        const snapshot = await firestore.collection(collName).get();
        if (snapshot.empty) continue;
        
        let batch = firestore.batch();
        let count = 0;
        for (const doc of snapshot.docs) {
          batch.delete(doc.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = firestore.batch();
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }
      console.log('Firestore database purged successfully.');
    } catch (error: any) {
      console.warn('Error purging Firestore database:', error instanceof Error ? error.message : error);
    }
  }

  public async reset() {
    this.initializeWithSeedData();
    this.save();
    await this.clearAllFromFirestore();
    await this.saveAllToFirestore();
  }

  private initializeWithSeedData() {
    const workspaceId = 'demo-workspace-123';
    const workspace: Workspace = {
      id: workspaceId,
      name: 'Acme SaaS',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    };

    const users: User[] = [
      {
        id: 'user-admin',
        name: 'Alice (Admin)',
        email: 'admin@loop.com',
        passwordHash: hashPassword('admin'),
        role: 'ADMIN',
        workspaceId,
      },
      {
        id: 'user-analyst',
        name: 'Bob (Analyst)',
        email: 'analyst@loop.com',
        passwordHash: hashPassword('analyst'),
        role: 'ANALYST',
        workspaceId,
      },
      {
        id: 'user-viewer',
        name: 'Charlie (Viewer)',
        email: 'viewer@loop.com',
        passwordHash: hashPassword('viewer'),
        role: 'VIEWER',
        workspaceId,
      }
    ];

    const themes: Theme[] = [
      { id: 'theme-onboarding', name: 'Onboarding', description: 'User sign up, setup flows, and early adoption hurdles', color: '#3b82f6', workspaceId },
      { id: 'theme-billing', name: 'Billing & Pricing', description: 'Invoices, checkout failures, pricing tiers, and refunds', color: '#ef4444', workspaceId },
      { id: 'theme-performance', name: 'Performance & Speed', description: 'Lag, loading spinners, timeout errors, and sluggish transitions', color: '#eab308', workspaceId },
      { id: 'theme-integrations', name: 'Integrations', description: 'SSO, Slack hooks, Salesforce sync, and webhooks issues', color: '#10b981', workspaceId },
      { id: 'theme-uiux', name: 'UI & Usability', description: 'Confusing menus, beautiful design, layout issues, dark mode', color: '#8b5cf6', workspaceId },
      { id: 'theme-features', name: 'Feature Requests', description: 'Export tools, bulk actions, tags, and calendar sync requests', color: '#ec4899', workspaceId },
    ];

    // Seed realistic feedback items (120+ items)
    const feedbacks: Feedback[] = [];
    const channels = ['Support ticket', 'App store review', 'NPS survey', 'Sales call note', 'Community post'];

    // Define seed templates per theme
    const onboardingTemplates = [
      { text: "Onboarding took forever — I couldn't figure out how to invite my team.", sentiment: 'NEG' as const, score: -0.8, feature: 'Team Invites', rationale: 'Explicit struggle with invitation menu during setup.' },
      { text: "Love the startup guide! Got my first project configured in under 5 minutes.", sentiment: 'POS' as const, score: 0.9, feature: 'Quickstart Guide', rationale: 'Highly positive feedback on initial setup guide.' },
      { text: "The setup wizard is clean, but it forces me to enter credit card details immediately which is annoying.", sentiment: 'NEU' as const, score: -0.1, feature: 'Paywall Location', rationale: 'Appreciates design but dislikes early friction.' },
      { text: "Unable to complete the email verification. The verification link in my inbox points to a broken page.", sentiment: 'NEG' as const, score: -0.9, feature: 'Email Verification', rationale: 'Critical bug preventing user onboarding.' },
      { text: "Is there a way to skip the product tour? I'm already familiar with this tool from my last job.", sentiment: 'NEU' as const, score: 0.0, feature: 'Product Tour', rationale: 'Neutral request to bypass setup animation.' },
    ];

    const billingTemplates = [
      { text: "Billing page keeps timing out when I try to download an invoice.", sentiment: 'NEG' as const, score: -0.7, feature: 'Invoice Downloads', rationale: 'Network timeout on invoice generation.' },
      { text: "The new annual discount is awesome. Saved our startup a bunch of money!", sentiment: 'POS' as const, score: 0.85, feature: 'Annual Pricing', rationale: 'Expresses satisfaction with annual billing discount.' },
      { text: "Why am I being charged sales tax twice? My receipt lists it under two different line items.", sentiment: 'NEG' as const, score: -0.5, feature: 'Tax Calculations', rationale: 'Confused and upset about double taxation charge.' },
      { text: "I need to change my billing email to accounts@company.com but the settings page keeps locking up.", sentiment: 'NEG' as const, score: -0.6, feature: 'Billing Info Settings', rationale: 'Page lockups during profile update.' },
      { text: "Can we pay via purchase order or bank transfer? Our finance team doesn't allow corporate credit cards.", sentiment: 'NEU' as const, score: 0.1, feature: 'Payment Methods', rationale: 'Standard request for alternative B2B payments.' },
    ];

    const performanceTemplates = [
      { text: "The dashboard loading time is unacceptable. It takes almost 15 seconds to load the charts.", sentiment: 'NEG' as const, score: -0.9, feature: 'Dashboard Speed', rationale: 'Upset about severe lag loading analytics.' },
      { text: "Much faster response times after the recent update! Pages transition instantly now.", sentiment: 'POS' as const, score: 0.95, feature: 'Page Transitions', rationale: 'Noticed and praised speed improvements.' },
      { text: "Sometimes the app freezes entirely when importing large datasets. I have to force refresh.", sentiment: 'NEG' as const, score: -0.8, feature: 'Bulk Import Performance', rationale: 'App crash during data ingestion.' },
      { text: "High memory usage in Chrome when keeping the tab open all day. CPU climbs to 40%.", sentiment: 'NEG' as const, score: -0.6, feature: 'Client Memory Usage', rationale: 'Concerned about tab leaks.' },
      { text: "The site is generally responsive, but occasionally searches take 3-4 seconds to yield results.", sentiment: 'NEU' as const, score: -0.2, feature: 'Search Performance', rationale: 'Mild complaint about query lag.' },
    ];

    const integrationTemplates = [
      { text: "Prospect wants SSO / SAML before they will sign — third time this month we lost a deal.", sentiment: 'NEG' as const, score: -0.75, feature: 'SAML SSO', rationale: 'Sales blocker due to lack of enterprise SSO.' },
      { text: "The Slack integration is super handy. We get instant notifications whenever feedback is ingested.", sentiment: 'POS' as const, score: 0.9, feature: 'Slack Integration', rationale: 'Praising Slack integration value.' },
      { text: "Webhooks are dropping payloads. Our server gets 500 errors when parsing your event structure.", sentiment: 'NEG' as const, score: -0.8, feature: 'Webhooks API', rationale: 'Upset about webhook payloads failing structure validation.' },
      { text: "Does this sync with Salesforce? Our sales reps need to see feedback history in CRM.", sentiment: 'NEU' as const, score: 0.2, feature: 'Salesforce Integration', rationale: 'Feature request for CRM sync.' },
      { text: "Just wired up the API and it was extremely straightforward. Clear endpoints and documentation.", sentiment: 'POS' as const, score: 0.8, feature: 'Developer API', rationale: 'Happy with API developer experience.' },
    ];

    const uiuxTemplates = [
      { text: "The new dashboard layout is gorgeous and finally fast. Huge improvement.", sentiment: 'POS' as const, score: 0.9, feature: 'Dashboard Layout', rationale: 'Enthusiastic praise for visual refresh.' },
      { text: "Contrast ratio in dark mode is too low. Some text is almost invisible against the gray background.", sentiment: 'NEG' as const, score: -0.5, feature: 'Dark Mode Contrast', rationale: 'Accessibility complaint regarding text contrast.' },
      { text: "The navigation sidebar is hidden behind a hamburger menu on desktop, which requires an extra click.", sentiment: 'NEU' as const, score: -0.1, feature: 'Sidebar Navigation', rationale: 'UI review suggesting desktop expansion.' },
      { text: "Love the custom theme accent colors! It fits our brand aesthetic perfectly.", sentiment: 'POS' as const, score: 0.85, feature: 'Branding Customization', rationale: 'Praising layout look and feel.' },
      { text: "The scrollbars are custom and behave strangely on trackpads. They jump around when scrolling fast.", sentiment: 'NEG' as const, score: -0.4, feature: 'Custom Scrollbar UI', rationale: 'Sluggish UI scroll experience.' },
    ];

    const featureTemplates = [
      { text: "Please add a CSV export option to the logs page! I need to manipulate this data in Excel.", sentiment: 'NEU' as const, score: 0.3, feature: 'CSV Data Export', rationale: 'Polite request for excel compatibility.' },
      { text: "We desperately need a bulk delete button for spam comments. Removing them one by one is exhausting.", sentiment: 'NEG' as const, score: -0.6, feature: 'Bulk Actions', rationale: 'Frustrated by lack of bulk actions.' },
      { text: "Is there an automated reports feature? I would love to receive a weekly email summary of our metrics.", sentiment: 'NEU' as const, score: 0.4, feature: 'Weekly Reports', rationale: 'Requesting recurring dashboard digest.' },
      { text: "The tagging system is powerful, but we need multi-level nested tags for detailed categorizations.", sentiment: 'NEU' as const, score: 0.2, feature: 'Nested Tags', rationale: 'Request for advanced taxonomy.' },
      { text: "Adding a dark mode toggle was the best update of the year. My eyes thank you!", sentiment: 'POS' as const, score: 0.9, feature: 'Dark Mode', rationale: 'Praise for dark theme option.' },
    ];

    const themeMap = [
      { id: 'theme-onboarding', templates: onboardingTemplates, label: 'Onboarding' },
      { id: 'theme-billing', templates: billingTemplates, label: 'Billing' },
      { id: 'theme-performance', templates: performanceTemplates, label: 'Performance' },
      { id: 'theme-integrations', templates: integrationTemplates, label: 'Integrations' },
      { id: 'theme-uiux', templates: uiuxTemplates, label: 'UI/UX' },
      { id: 'theme-features', templates: featureTemplates, label: 'Features' },
    ];

    // Let's generate 125 feedback items spread across the last 30 days
    let idCounter = 1;
    const now = Date.now();

    for (let i = 0; i < 125; i++) {
      const themeChoice = themeMap[i % themeMap.length];
      const template = themeChoice.templates[Math.floor(i / themeMap.length) % themeChoice.templates.length];
      const channel = channels[i % channels.length];

      // Shift date backwards randomly over 30 days
      const daysAgo = (i * 0.24) + (Math.random() * 0.5); // Spread smoothly over last 30 days
      const date = new Date(now - daysAgo * 24 * 3600 * 1000).toISOString();

      // Slightly vary the text so they look different
      let content = template.text;
      if (i % 3 === 1) {
        content = content.replace("!", ".").replace("I ", "Our team ").replace("my ", "our ");
      } else if (i % 3 === 2) {
        content = "Actually, " + content.charAt(0).toLowerCase() + content.slice(1) + " (using workspace #" + (i + 100) + ")";
      }

      const item: Feedback = {
        id: `feedback-${idCounter++}`,
        content,
        channel,
        sourceRef: `${channel.replace(/ /g, '-').toLowerCase()}-${1000 + i}`,
        customerLabel: template.feature,
        sentiment: template.sentiment,
        sentimentScore: parseFloat((template.score + (Math.random() * 0.1 - 0.05)).toFixed(2)),
        status: i % 4 === 0 ? 'ACTIONED' : (i % 3 === 0 ? 'REVIEWED' : 'NEW'),
        createdAt: date,
        workspaceId,
        themes: [themeChoice.id],
        featureArea: template.feature,
        rationale: template.rationale,
      };

      // Generate embedding vector
      item.embedding = generateSimulatedEmbedding(item.content);
      feedbacks.push(item);
    }

    this.schema.workspaces = [workspace];
    this.schema.users = users;
    this.schema.feedbacks = feedbacks;
    this.schema.themes = themes;
    this.schema.reports = [];
    this.schema.sessions = [];
  }

  // --- Workspace Methods ---
  public getWorkspace(id: string): Workspace | undefined {
    return this.schema.workspaces.find(w => w.id === id);
  }

  public createWorkspace(name: string): Workspace {
    const workspace: Workspace = {
      id: 'workspace-' + Math.random().toString(36).substring(2, 9),
      name,
      createdAt: new Date().toISOString(),
    };
    this.schema.workspaces.push(workspace);
    this.save();
    this.saveDocToFirestore('workspaces', workspace.id, workspace);
    return workspace;
  }

  // --- User Methods ---
  public getUser(id: string): User | undefined {
    return this.schema.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.schema.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      ...user,
      id: 'user-' + Math.random().toString(36).substring(2, 9),
    };
    this.schema.users.push(newUser);
    this.save();
    this.saveDocToFirestore('users', newUser.id, newUser);
    return newUser;
  }

  public getUsersInWorkspace(workspaceId: string): User[] {
    return this.schema.users.filter(u => u.workspaceId === workspaceId);
  }

  public updateUserRole(userId: string, role: 'ADMIN' | 'ANALYST' | 'VIEWER', workspaceId: string): boolean {
    const user = this.schema.users.find(u => u.id === userId && u.workspaceId === workspaceId);
    if (user) {
      user.role = role;
      this.save();
      this.saveDocToFirestore('users', user.id, user);
      return true;
    }
    return false;
  }

  // --- Feedback Methods ---
  public getFeedback(id: string, workspaceId: string): Feedback | undefined {
    return this.schema.feedbacks.find(f => f.id === id && f.workspaceId === workspaceId);
  }

  public queryFeedback(
    workspaceId: string,
    filters: {
      search?: string;
      channel?: string;
      sentiment?: string;
      theme?: string;
      status?: string;
      dateStart?: string;
      dateEnd?: string;
      page?: number;
      limit?: number;
    }
  ) {
    let list = this.schema.feedbacks.filter(f => f.workspaceId === workspaceId);

    // Filter by channel
    if (filters.channel) {
      list = list.filter(f => f.channel === filters.channel);
    }

    // Filter by sentiment
    if (filters.sentiment) {
      list = list.filter(f => f.sentiment === filters.sentiment);
    }

    // Filter by status
    if (filters.status) {
      list = list.filter(f => f.status === filters.status);
    }

    // Filter by theme
    if (filters.theme) {
      list = list.filter(f => f.themes.includes(filters.theme!));
    }

    // Filter by date range
    if (filters.dateStart) {
      const start = new Date(filters.dateStart).getTime();
      list = list.filter(f => new Date(f.createdAt).getTime() >= start);
    }
    if (filters.dateEnd) {
      const end = new Date(filters.dateEnd).getTime();
      list = list.filter(f => new Date(f.createdAt).getTime() <= end);
    }

    // Full-text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      list = list.filter(f =>
        f.content.toLowerCase().includes(searchLower) ||
        f.customerLabel.toLowerCase().includes(searchLower) ||
        f.featureArea.toLowerCase().includes(searchLower)
      );
    }

    // Sort by createdAt desc
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = list.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      }
    };
  }

  public createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Feedback {
    const item: Feedback = {
      ...feedback,
      id: 'feedback-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      embedding: generateSimulatedEmbedding(feedback.content),
    };
    this.schema.feedbacks.push(item);
    this.save();
    this.saveDocToFirestore('feedbacks', item.id, item);
    return item;
  }

  public updateFeedbackStatus(id: string, status: 'NEW' | 'REVIEWED' | 'ACTIONED', workspaceId: string): boolean {
    const item = this.schema.feedbacks.find(f => f.id === id && f.workspaceId === workspaceId);
    if (item) {
      item.status = status;
      this.save();
      this.saveDocToFirestore('feedbacks', item.id, item);
      return true;
    }
    return false;
  }

  public updateFeedbackClassification(
    id: string,
    workspaceId: string,
    classification: {
      sentiment: 'POS' | 'NEU' | 'NEG';
      sentimentScore: number;
      themes: string[];
      featureArea: string;
      rationale: string;
    }
  ): boolean {
    const item = this.schema.feedbacks.find(f => f.id === id && f.workspaceId === workspaceId);
    if (item) {
      item.sentiment = classification.sentiment;
      item.sentimentScore = classification.sentimentScore;
      item.themes = classification.themes;
      item.featureArea = classification.featureArea;
      item.rationale = classification.rationale;
      // Re-generate embedding
      item.embedding = generateSimulatedEmbedding(item.content);
      this.save();
      this.saveDocToFirestore('feedbacks', item.id, item);
      return true;
    }
    return false;
  }

  // --- Theme Methods ---
  public getThemes(workspaceId: string): Theme[] {
    return this.schema.themes.filter(t => t.workspaceId === workspaceId);
  }

  public createTheme(name: string, description: string, color: string, workspaceId: string): Theme {
    const id = 'theme-' + Math.random().toString(36).substring(2, 9);
    const theme: Theme = { id, name, description, color, workspaceId };
    this.schema.themes.push(theme);
    this.save();
    this.saveDocToFirestore('themes', theme.id, theme);
    return theme;
  }

  // --- Report Methods ---
  public getReports(workspaceId: string): Report[] {
    return this.schema.reports.filter(r => r.workspaceId === workspaceId);
  }

  public createReport(report: Omit<Report, 'id' | 'createdAt'>): Report {
    const item: Report = {
      ...report,
      id: 'report-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    this.schema.reports.push(item);
    this.save();
    this.saveDocToFirestore('reports', item.id, item);
    return item;
  }

  public getReport(id: string, workspaceId: string): Report | undefined {
    return this.schema.reports.find(r => r.id === id && r.workspaceId === workspaceId);
  }

  // --- Session Methods ---
  public createSession(user: User, workspaceName: string): Session {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours
    const session: Session = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName,
      },
      expiresAt,
    };
    this.schema.sessions.push(session);
    this.save();
    this.saveDocToFirestore('sessions', session.token, session);
    return session;
  }

  public getSession(token: string): Session | undefined {
    const session = this.schema.sessions.find(s => s.token === token);
    if (session && new Date(session.expiresAt).getTime() > Date.now()) {
      return session;
    }
    return undefined;
  }

  public deleteSession(token: string) {
    this.schema.sessions = this.schema.sessions.filter(s => s.token !== token);
    this.save();
    this.deleteDocFromFirestore('sessions', token);
  }
}

export const db = new LocalDB();
