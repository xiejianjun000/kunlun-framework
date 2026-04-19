/**
 * Neo4j 图谱注入器
 * Neo4j Graph Injector - 将知识注入 Neo4j 图数据库
 * 
 * 注意: 需要安装 neo4j-driver 包才能使用
 */

// Neo4j 类型声明（当 neo4j-driver 未安装时使用）
interface Neo4jDriverInterface {
  close(): Promise<void>;
  session(options?: { database?: string }): Neo4jSessionInterface;
}

interface Neo4jSessionInterface {
  run(query: string, params?: Record<string, unknown>): Promise<{
    records: Array<{
      get(name: string): unknown;
    }>;
  }>;
  close(): Promise<void>;
}

// neo4j-driver 模块类型
interface Neo4jModule {
  driver(url: string, auth: { principal: string; credentials: string }): Neo4jDriverInterface;
  auth: {
    basic(user: string, password: string): { principal: string; credentials: string };
  };
}

// 动态导入 neo4j-driver
let neo4jModule: Neo4jModule | null = null;

async function getNeo4jModule(): Promise<Neo4jModule> {
  if (!neo4jModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const neo4j = require('neo4j-driver') as Neo4jModule;
      neo4jModule = neo4j;
    } catch {
      throw new Error('neo4j-driver is not installed. Please run: npm install neo4j-driver');
    }
  }
  return neo4jModule;
}

import {
  GraphInjector,
  KnowledgeRelation,
  ExtractedKnowledge,
} from '../types';

/**
 * Neo4j 配置
 */
export interface Neo4jConfig {
  /** 连接 URL */
  url: string;
  /** 用户名 */
  user: string;
  /** 密码 */
  password: string;
  /** 数据库名称（可选，默认为 neo4j） */
  database?: string;
}

/**
 * Neo4j 图谱注入器
 * 
 * 将提取的知识注入 Neo4j 图数据库
 * 
 * @example
 * ```typescript
 * const injector = new Neo4jGraphInjector({
 *   url: 'bolt://localhost:7687',
 *   user: 'neo4j',
 *   password: 'password'
 * });
 * 
 * await injector.connect();
 * await injector.injectNodes(['closure', 'javascript']);
 * await injector.injectRelations([{
 *   from: 'closure',
 *   to: 'javascript',
 *   type: 'belongs_to'
 * }]);
 * await injector.close();
 * ```
 */
export class Neo4jGraphInjector implements GraphInjector {
  private readonly config: Neo4jConfig;
  private driver: Neo4jDriverInterface | null = null;
  private session: Neo4jSessionInterface | null = null;

  /**
   * 构造函数
   * @param config Neo4j 配置
   */
  constructor(config: Neo4jConfig) {
    this.config = {
      database: 'neo4j',
      ...config,
    };
  }

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    if (this.driver) {
      return;
    }

    try {
      const neo4j = await getNeo4jModule();
      this.driver = neo4j.driver(
        this.config.url,
        neo4j.auth.basic(this.config.user, this.config.password)
      );

      // 验证连接
      this.session = this.driver.session({
        database: this.config.database,
      });
      
      await this.session.run('RETURN 1');
      console.log('[Neo4jGraphInjector] 连接成功');
    } catch (error) {
      console.error('[Neo4jGraphInjector] 连接失败:', error);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
    console.log('[Neo4jGraphInjector] 连接已关闭');
  }

  /**
   * 注入节点
   * 
   * @param nodes 节点列表
   */
  async injectNodes(nodes: string[]): Promise<void> {
    if (!this.session) {
      throw new Error('未连接数据库');
    }

    if (nodes.length === 0) {
      return;
    }

    try {
      const query = `
        UNWIND $nodes AS nodeName
        MERGE (n:Concept {name: nodeName})
        ON CREATE SET n.createdAt = datetime(), n.count = 1
        ON MATCH SET n.count = n.count + 1, n.lastSeen = datetime()
      `;

      await this.session.run(query, { nodes });
      console.log(`[Neo4jGraphInjector] 注入 ${nodes.length} 个节点`);
    } catch (error) {
      console.error('[Neo4jGraphInjector] 注入节点失败:', error);
      throw error;
    }
  }

  /**
   * 注入关系
   * 
   * @param relations 关系列表
   */
  async injectRelations(relations: KnowledgeRelation[]): Promise<void> {
    if (!this.session) {
      throw new Error('未连接数据库');
    }

    if (relations.length === 0) {
      return;
    }

    try {
      // Neo4j 不支持动态关系类型，需要逐条处理
      for (const relItem of relations) {
        const singleQuery = `
          MATCH (a:Concept {name: $from})
          MATCH (b:Concept {name: $to})
          MERGE (a)-[r:` + relItem.type + `]->(b)
          ON CREATE SET r.createdAt = datetime(), r.confidence = $confidence
          ON MATCH SET r.confidence = coalesce(r.confidence, $confidence),
                       r.updatedAt = datetime()
        `;
        
        await this.session.run(singleQuery, {
          from: relItem.from,
          to: relItem.to,
          confidence: relItem.confidence || 0.8,
        });
      }

      console.log(`[Neo4jGraphInjector] 注入 ${relations.length} 条关系`);
    } catch (error) {
      console.error('[Neo4jGraphInjector] 注入关系失败:', error);
      throw error;
    }
  }

  /**
   * 批量注入（从知识结构）
   * 
   * @param knowledge 提取的知识结构
   */
  async batchInject(knowledge: ExtractedKnowledge): Promise<void> {
    await this.connect();

    try {
      // 先注入所有节点
      await this.injectNodes(knowledge.concepts);
      
      // 再注入所有关系
      await this.injectRelations(knowledge.relations);
      
      console.log(
        `[Neo4jGraphInjector] 批量注入完成: ` +
        `${knowledge.concepts.length} 节点, ${knowledge.relations.length} 关系`
      );
    } catch (error) {
      console.error('[Neo4jGraphInjector] 批量注入失败:', error);
      throw error;
    }
  }

  /**
   * 查询节点
   * 
   * @param name 节点名称
   */
  async findNode(name: string): Promise<Record<string, unknown> | null> {
    if (!this.session) {
      throw new Error('未连接数据库');
    }

    const query = `
      MATCH (n:Concept {name: $name})
      RETURN n
    `;

    const result = await this.session.run(query, { name });
    const record = result.records[0];
    
    if (record) {
      const node = record.get('n') as { properties?: Record<string, unknown> };
      return node.properties || null;
    }
    
    return null;
  }

  /**
   * 查询相关节点
   * 
   * @param name 节点名称
   * @param depth 深度
   */
  async findRelatedNodes(name: string, depth: number = 1): Promise<string[]> {
    if (!this.session) {
      throw new Error('未连接数据库');
    }

    const query = `
      MATCH (n:Concept {name: $name})-[*1..${depth}]-(related)
      RETURN DISTINCT related.name AS name
    `;

    const result = await this.session.run(query, { name });
    return result.records.map(r => r.get('name') as string);
  }
}

/**
 * 创建 Neo4j 图注入器
 */
export function createNeo4jGraphInjector(config: Neo4jConfig): Neo4jGraphInjector {
  return new Neo4jGraphInjector(config);
}
