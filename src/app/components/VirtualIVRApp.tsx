import React, { useState, useEffect } from 'react';
import { Phone, Clock, ArrowLeft, ArrowRight, Star, Bot, Package, Wrench, CreditCard, MessageCircle } from 'lucide-react';
import { useDepartments } from '@/hooks/useMicroCMS';
import FAQPage from './FAQPage';
import PhonePage from './PhonePage';
import LoadingSpinner from './LoadingSpinner';
import type { BrowsingHistory, RecommendationResult } from '@/types';

const VirtualIVRApp = () => {
  const [currentPage, setCurrentPage] = useState('main');
  const [browsingHistory, setBrowsingHistory] = useState<BrowsingHistory[]>([]);
  const [pageStartTime, setPageStartTime] = useState(Date.now());

  // microCMSからデータを取得
  const { departments, loading: departmentsLoading, error: departmentsError } = useDepartments();

  // ルールベース推奨システム
  class RuleBasedRecommendation {
    private pageRules = {
      'product': { department: 'sales', baseScore: 3, category: '製品情報' },
      'pricing': { department: 'sales', baseScore: 5, category: '価格相談' },
      'support': { department: 'support', baseScore: 4, category: 'サポート' },
      'tech': { department: 'tech', baseScore: 4, category: '技術サポート' },
      'billing': { department: 'billing', baseScore: 5, category: '請求関連' },
      'faq': { department: 'support', baseScore: 3, category: 'FAQ' }
    };

    getRecommendation(history: BrowsingHistory[]): RecommendationResult | null {
      if (history.length === 0) return null;

      const scores = { sales: 0, support: 0, tech: 0, billing: 0, general: 0 };
      
      history.forEach(visit => {
        const rule = this.findMatchingRule(visit.page);
        if (rule) {
          let score = rule.baseScore;
          score *= this.getTimeMultiplier(visit.timeSpent);
          score *= this.getRecencyMultiplier(visit.timestamp);
          scores[rule.department as keyof typeof scores] += score;
        }
      });

      const topDept = Object.entries(scores)
        .sort(([,a], [,b]) => b - a)
        .filter(([,score]) => score > 0)[0];

      if (!topDept || topDept[1] < 3) return null;

      const confidence = topDept[1] >= 8 ? 'high' : topDept[1] >= 5 ? 'medium' : 'low';
      
      return {
        department: topDept[0],
        score: topDept[1].toFixed(1),
        confidence,
        reason: this.generateReason(topDept[0], history)
      };
    }

    private findMatchingRule(page: string) {
      for (const [pattern, rule] of Object.entries(this.pageRules)) {
        if (page.includes(pattern)) return rule;
      }
      return null;
    }

    private getTimeMultiplier(timeSpent: number) {
      if (timeSpent < 30) return 1.0;
      if (timeSpent < 60) return 1.5;
      return 2.0;
    }

    private getRecencyMultiplier(timestamp: number) {
      const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
      if (hoursSince < 1) return 1.5;
      if (hoursSince < 24) return 1.2;
      return 1.0;
    }

    private generateReason(deptId: string, history: BrowsingHistory[]) {
      const reasons: Record<string, string> = {
        sales: '製品・価格ページの閲覧が多いため',
        support: 'サポートページの閲覧が多いため',
        tech: '技術関連ページの閲覧が多いため',
        billing: '請求関連ページの閲覧が多いため'
      };
      return reasons[deptId] || '閲覧履歴を総合的に判断しました';
    }
  }

  const recommender = new RuleBasedRecommendation();

  // 会社ロゴSVGコンポーネント
  const CompanyLogo = () => (
    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="24" height="24" rx="4" fill="#3B82F6"/>
      <rect x="6" y="12" width="4" height="16" fill="white"/>
      <rect x="12" y="16" width="4" height="12" fill="white"/>
      <rect x="18" y="14" width="4" height="14" fill="white"/>
      <text x="35" y="26" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#1F2937">
        TechSupport
      </text>
    </svg>
  );

  // ヘッダーコンポーネント
  const Header = () => (
    <header className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <CompanyLogo />
      </div>
    </header>
  );

  // 営業時間チェック
  const isBusinessHours = (dept: any) => {
    if (dept.businessHours?.emergency) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    if (isWeekend && !dept.businessHours?.weekends) return false;
    return currentHour >= dept.businessHours?.start && currentHour < dept.businessHours?.end;
  };

  // ページ遷移時の履歴記録
  const navigateToPage = (page: string) => {
    const timeSpent = Math.floor((Date.now() - pageStartTime) / 1000);
    
    if (currentPage !== 'main') {
      setBrowsingHistory(prev => [...prev, {
        page: currentPage,
        timeSpent,
        timestamp: Date.now()
      }]);
    }
    
    setCurrentPage(page);
    setPageStartTime(Date.now());
  };

  // AIレコメンデーション表示
  const AIRecommendation = () => {
    const recommendation = recommender.getRecommendation(browsingHistory);
    
    if (!recommendation) return null;

    const dept = departments[recommendation.department];
    if (!dept) return null;

    const isActive = isBusinessHours(dept);

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">AIからのおすすめ</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            信頼度: {recommendation.confidence}
          </span>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <h4 className="font-medium text-gray-900 mb-1">{dept.name}</h4>
          <p className="text-sm text-gray-600 mb-2">{dept.description}</p>
          
          <div className={`flex items-center gap-2 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
            <Phone className="w-4 h-4" />
            <span className={`font-mono ${isActive ? '' : 'line-through'}`}>
              {dept.phone}
            </span>
            {!isActive && <span className="text-xs">(営業時間外)</span>}
          </div>
          
          <p className="text-xs text-blue-600 mt-2">
            理由: {recommendation.reason}
          </p>
        </div>
      </div>
    );
  };

  // ローディング表示
  if (departmentsLoading) {
    return <LoadingSpinner />;
  }

  // エラー表示
  if (departmentsError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <p className="text-red-600 mb-4 text-lg font-semibold">エラーが発生しました</p>
          <p className="text-gray-600 mb-4">{departmentsError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // メインメニューページ
  const MainMenu = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          カスタマーサポート
        </h1>
        <p className="text-gray-600">
          お困りのことがございましたら、該当するカテゴリをお選びください
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => navigateToPage('product')}
          className="aspect-square flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 group"
        >
          <Package className="w-24 h-24 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-2xl text-gray-900 text-center mb-2">製品・サービス</h3>
          <p className="text-base text-gray-600 text-center">製品の詳細・仕様</p>
        </button>

        <button
          onClick={() => navigateToPage('support')}
          className="aspect-square flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-green-300 transition-all duration-200 group"
        >
          <Wrench className="w-24 h-24 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-2xl text-gray-900 text-center mb-2">技術サポート</h3>
          <p className="text-base text-gray-600 text-center">使い方・トラブル</p>
        </button>

        <button
          onClick={() => navigateToPage('billing')}
          className="aspect-square flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 transition-all duration-200 group"
        >
          <CreditCard className="w-24 h-24 text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-2xl text-gray-900 text-center mb-2">請求・アカウント</h3>
          <p className="text-base text-gray-600 text-center">請求書・支払い</p>
        </button>

        <button
          onClick={() => navigateToPage('phone-general')}
          className="aspect-square flex flex-col items-center justify-center p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 group"
        >
          <MessageCircle className="w-24 h-24 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-2xl text-blue-900 text-center mb-2">その他</h3>
          <p className="text-base text-blue-700 text-center">一般的なお問い合わせ</p>
        </button>
      </div>

      {/* お電話でのお問い合わせエリア */}
      {departments.general && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <h3 className="font-bold text-red-800 mb-2 flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" />
              お急ぎの場合はお電話で
            </h3>
            
            <div className="mb-3">
              <div className="font-mono text-xl font-bold text-blue-600">{departments.general.phone}</div>
              <div className="text-sm font-semibold text-gray-700">
                {departments.general.name}
                <span className="ml-2">
                  {isBusinessHours(departments.general) ? 
                    <span className="text-green-600 font-semibold">営業中</span> : 
                    <span className="text-red-500 font-semibold">営業時間外</span>
                  }
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-600">{departments.general.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              営業時間: {departments.general.businessHours?.start}:00-{departments.general.businessHours?.end}:00（平日のみ）
            </p>
          </div>
        </div>
      )}

      {/* よくあるご質問エリア */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-gray-900 mb-4 text-center">よくあるご質問</h3>
        <div className="space-y-3">
          <button
            onClick={() => navigateToPage('faq-software')}
            className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">ソフトウェア製品について</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">インストール方法、ライセンスキーなど</p>
          </button>

          <button
            onClick={() => navigateToPage('faq-hardware')}
            className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">ハードウェア製品について</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">保証期間、故障時の対応など</p>
          </button>

          <button
            onClick={() => navigateToPage('faq-billing')}
            className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">請求・支払いについて</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 mt-1">請求書発行、支払い方法変更など</p>
          </button>
        </div>
      </div>

      <AIRecommendation />
    </div>
  );

  // 製品メニューページ
  const ProductMenu = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigateToPage('main')} className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">製品・サービス情報</h2>
      </div>

      <AIRecommendation />

      <div className="grid gap-4">
        <button
          onClick={() => navigateToPage('faq-software')}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="text-left">
            <h3 className="font-semibold">ソフトウェア製品</h3>
            <p className="text-sm text-gray-600">アプリケーション、ライセンス関連</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => navigateToPage('faq-hardware')}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="text-left">
            <h3 className="font-semibold">ハードウェア製品</h3>
            <p className="text-sm text-gray-600">機器、デバイス、周辺機器</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => navigateToPage('phone-sales')}
          className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
        >
          <div className="text-left">
            <h3 className="font-semibold text-green-900">解決できない場合</h3>
            <p className="text-sm text-green-700">営業部に直接お問い合わせ</p>
          </div>
          <Phone className="w-5 h-5 text-green-600" />
        </button>
      </div>
    </div>
  );

  // ページルーティング
  const renderPage = () => {
    switch (currentPage) {
      case 'main':
        return <MainMenu />;
      case 'product':
        return <ProductMenu />;
      case 'support':
        return <ProductMenu />;
      case 'billing':
        return (
          <FAQPage 
            category="billing" 
            title="請求・アカウント" 
            backPage="main" 
            onNavigate={navigateToPage}
            onAIRecommendation={() => <AIRecommendation />}
          />
        );
      case 'faq-software':
        return (
          <FAQPage 
            category="software" 
            title="ソフトウェア製品 FAQ" 
            backPage="main" 
            onNavigate={navigateToPage}
            onAIRecommendation={() => <AIRecommendation />}
          />
        );
      case 'faq-hardware':
        return (
          <FAQPage 
            category="hardware" 
            title="ハードウェア製品 FAQ" 
            backPage="main" 
            onNavigate={navigateToPage}
            onAIRecommendation={() => <AIRecommendation />}
          />
        );
      case 'faq-billing':
        return (
          <FAQPage 
            category="billing" 
            title="請求・支払い FAQ" 
            backPage="main" 
            onNavigate={navigateToPage}
            onAIRecommendation={() => <AIRecommendation />}
          />
        );
      case 'phone-sales':
        return departments.sales && departments.emergency ? (
          <PhonePage 
            dept={departments.sales} 
            emergencyDept={departments.emergency}
            backPage="product" 
            onNavigate={navigateToPage}
            isBusinessHours={isBusinessHours}
          />
        ) : null;
      case 'phone-support':
        return departments.support && departments.emergency ? (
          <PhonePage 
            dept={departments.support} 
            emergencyDept={departments.emergency}
            backPage="support" 
            onNavigate={navigateToPage}
            isBusinessHours={isBusinessHours}
          />
        ) : null;
      case 'phone-tech':
        return departments.tech && departments.emergency ? (
          <PhonePage 
            dept={departments.tech} 
            emergencyDept={departments.emergency}
            backPage="support" 
            onNavigate={navigateToPage}
            isBusinessHours={isBusinessHours}
          />
        ) : null;
      case 'phone-billing':
        return departments.billing && departments.emergency ? (
          <PhonePage 
            dept={departments.billing} 
            emergencyDept={departments.emergency}
            backPage="billing" 
            onNavigate={navigateToPage}
            isBusinessHours={isBusinessHours}
          />
        ) : null;
      case 'phone-general':
        return departments.general && departments.emergency ? (
          <PhonePage 
            dept={departments.general} 
            emergencyDept={departments.emergency}
            backPage="main" 
            onNavigate={navigateToPage}
            isBusinessHours={isBusinessHours}
          />
        ) : null;
      default:
        return <MainMenu />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        {renderPage()}
        
        {/* デバッグ用: 閲覧履歴表示 */}
        {browsingHistory.length > 0 && process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">閲覧履歴 (開発用)</h4>
            <div className="text-xs text-gray-600 space-y-1">
              {browsingHistory.map((visit, index) => (
                <div key={index}>
                  {visit.page} ({visit.timeSpent}秒滞在)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualIVRApp;